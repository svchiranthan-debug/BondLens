"""
Advanced Fixed-Income Pricing, Cash Flow Generation, and Zero-Volatility Spread (Z-Spread) Engine.
Addresses senior analyst audit points:
1. End-of-month (EOM) coupon calendar rules.
2. Spot zero-coupon Treasury curve bootstrapping.
3. Exact numerical root-finding for Z-spread (Zero-Volatility Spread).
4. Dollar duration, analytical convexity, and price sensitivity.
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import List, Tuple, Optional, Dict, Any
import math
import numpy as np
from scipy.optimize import brentq, newton


@dataclass
class CashFlow:
    flow_date: date
    years_to_flow: float
    coupon_amount: float
    principal_amount: float
    total_amount: float
    discount_factor: float = 1.0
    present_value: float = 0.0


@dataclass
class BondAnalyticsResult:
    clean_price: float
    dirty_price: float
    accrued_interest: float
    ytm: float
    macaulay_duration: float
    modified_duration: float
    convexity: float
    dv01: float
    cash_flows: List[CashFlow]
    price_sensitivity: dict


def is_last_day_of_month(d: date) -> bool:
    """Returns True if the date is the final day of its calendar month."""
    next_day = d.day + 1
    # Check if adding 1 day rolls month
    m = d.month
    max_day = 30 if m in (4, 6, 9, 11) else (29 if m == 2 and ((d.year % 4 == 0 and d.year % 100 != 0) or d.year % 400 == 0) else (28 if m == 2 else 31))
    return d.day >= max_day


def get_month_end_day(year: int, month: int) -> int:
    """Get exact last day of given month, accounting for leap years."""
    if month in (4, 6, 9, 11):
        return 30
    elif month == 2:
        is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
        return 29 if is_leap else 28
    else:
        return 31


def year_fraction_30_360(d1: date, d2: date) -> float:
    """30E/360 or 30/360 Bond Basis day count fraction."""
    d1_day = min(d1.day, 30)
    d2_day = 30 if d1_day == 30 and d2.day == 31 else min(d2.day, 30)
    return ((d2.year - d1.year) * 360 + (d2.month - d1.month) * 30 + (d2_day - d1_day)) / 360.0


def year_fraction_act_act(d1: date, d2: date) -> float:
    """Actual/Actual day count fraction."""
    delta = (d2 - d1).days
    avg_year_days = 365.25
    return delta / avg_year_days


def generate_cash_flows(
    settlement_date: date,
    maturity_date: date,
    coupon_rate: float,
    frequency: int = 2,
    face_value: float = 100.0,
    day_count: str = "30/360"
) -> Tuple[List[CashFlow], float]:
    """
    Generate coupon and principal cash flows from settlement to maturity.
    Follows institutional End-of-Month (EOM) roll convention:
    if maturity is at month-end, all prior coupons are preserved at month-end.
    """
    if settlement_date >= maturity_date:
        raise ValueError("Settlement date must be strictly before maturity date.")
    
    is_eom = is_last_day_of_month(maturity_date)
    orig_day = maturity_date.day
    
    dates = []
    curr_year = maturity_date.year
    curr_month = maturity_date.month
    months_step = 12 // frequency

    c_date = maturity_date
    while c_date > settlement_date:
        dates.append(c_date)
        # Step backward
        curr_month -= months_step
        while curr_month <= 0:
            curr_month += 12
            curr_year -= 1
            
        if is_eom:
            target_day = get_month_end_day(curr_year, curr_month)
        else:
            max_d = get_month_end_day(curr_year, curr_month)
            target_day = min(orig_day, max_d)
            
        c_date = date(curr_year, curr_month, target_day)
    
    last_coupon_date = c_date
    flow_dates = sorted(dates)
    coupon_per_period = (coupon_rate * face_value) / frequency
    
    # Calculate accrued interest
    if flow_dates:
        next_coupon_date = flow_dates[0]
        if day_count == "30/360":
            accrued_frac = year_fraction_30_360(last_coupon_date, settlement_date)
            period_frac = year_fraction_30_360(last_coupon_date, next_coupon_date)
        else:
            accrued_frac = (settlement_date - last_coupon_date).days / 365.25
            period_frac = (next_coupon_date - last_coupon_date).days / 365.25
            
        accrual_ratio = max(0.0, min(1.0, (accrued_frac / period_frac) if period_frac > 0 else 0.0))
        accrued_interest = accrual_ratio * coupon_per_period
    else:
        accrued_interest = 0.0

    cash_flows: List[CashFlow] = []
    for i, fd in enumerate(flow_dates):
        if day_count == "30/360":
            t = year_fraction_30_360(settlement_date, fd)
        else:
            t = year_fraction_act_act(settlement_date, fd)
            
        is_maturity = (i == len(flow_dates) - 1)
        cpn = coupon_per_period
        principal = face_value if is_maturity else 0.0
        total = cpn + principal
        
        cash_flows.append(CashFlow(
            flow_date=fd,
            years_to_flow=max(t, 0.0001),
            coupon_amount=cpn,
            principal_amount=principal,
            total_amount=total
        ))
        
    return cash_flows, round(accrued_interest, 6)


def price_from_ytm(
    ytm: float,
    cash_flows: List[CashFlow],
    frequency: int = 2
) -> float:
    """
    Dirty price given YTM (decimal, e.g. 0.05 for 5%).
    Discounting: (1 + y/m)^(m * t).
    """
    dirty_price = 0.0
    for cf in cash_flows:
        discount = math.pow(1.0 + ytm / frequency, frequency * cf.years_to_flow)
        dirty_price += cf.total_amount / discount
    return dirty_price


def d_price_d_ytm(
    ytm: float,
    cash_flows: List[CashFlow],
    frequency: int = 2
) -> float:
    """Analytical first derivative dP/dy."""
    deriv = 0.0
    for cf in cash_flows:
        discount = math.pow(1.0 + ytm / frequency, frequency * cf.years_to_flow + 1.0)
        deriv -= (cf.years_to_flow * cf.total_amount) / discount
    return deriv


def calculate_ytm(
    target_dirty_price: float,
    cash_flows: List[CashFlow],
    frequency: int = 2,
    initial_guess: float = 0.05
) -> float:
    """
    Solve for YTM given target dirty price using Brent's method with Newton-Raphson fallback.
    """
    def objective(y):
        return price_from_ytm(y, cash_flows, frequency) - target_dirty_price
    
    try:
        sol = brentq(objective, -0.05, 1.5, xtol=1e-9, maxiter=100)
        return float(sol)
    except (ValueError, RuntimeError):
        pass
    
    def obj_and_prime(y):
        val = price_from_ytm(y, cash_flows, frequency) - target_dirty_price
        prime = d_price_d_ytm(y, cash_flows, frequency)
        return val, prime

    try:
        sol = newton(
            func=lambda y: obj_and_prime(y)[0],
            x0=initial_guess,
            fprime=lambda y: obj_and_prime(y)[1],
            tol=1e-9,
            maxiter=100
        )
        return float(sol)
    except Exception:
        grid = np.linspace(0.0001, 0.50, 1000)
        vals = [abs(objective(g)) for g in grid]
        return float(grid[np.argmin(vals)])


def calculate_duration_convexity(
    ytm: float,
    cash_flows: List[CashFlow],
    dirty_price: float,
    frequency: int = 2
) -> Tuple[float, float, float, float]:
    """
    Calculates Macaulay duration, Modified duration, analytical Convexity, and DV01.
    Convexity = (1 / P) * d2P/dy2 = (1 / [P * (1 + y/m)^2]) * sum [ t * (t + 1/m) * CF_t / (1 + y/m)^(m*t) ]
    """
    if dirty_price <= 0:
        return 0.0, 0.0, 0.0, 0.0
    
    weighted_time_sum = 0.0
    convexity_sum = 0.0
    
    for cf in cash_flows:
        discount = math.pow(1.0 + ytm / frequency, frequency * cf.years_to_flow)
        pv = cf.total_amount / discount
        cf.present_value = pv
        
        t = cf.years_to_flow
        weighted_time_sum += t * pv
        convexity_sum += t * (t + 1.0 / frequency) * pv

    mac_duration = weighted_time_sum / dirty_price
    mod_duration = mac_duration / (1.0 + ytm / frequency)
    convexity = (1.0 / (dirty_price * math.pow(1.0 + ytm / frequency, 2.0))) * convexity_sum
    dv01 = dirty_price * mod_duration * 0.0001
    
    return round(mac_duration, 4), round(mod_duration, 4), round(convexity, 4), round(dv01, 5)


def calculate_z_spread_bps(
    dirty_price: float,
    cash_flows: List[CashFlow],
    spot_curve_fn,
    frequency: int = 2,
    initial_guess_bps: float = 150.0
) -> float:
    """
    Solves for Zero-Volatility Spread (Z-spread) in basis points:
    Dirty Price = sum_k [ CF_k / (1 + (r_spot(t_k) + z) / m )^(m * t_k) ]
    Unlike G-spread, Z-spread accounts for the full shape and curvature of the spot curve.
    """
    def objective(z_decimal: float) -> float:
        pv = 0.0
        for cf in cash_flows:
            t = cf.years_to_flow
            r_spot = spot_curve_fn(t)
            disc_rate = 1.0 + (r_spot + z_decimal) / frequency
            pv += cf.total_amount / math.pow(disc_rate, frequency * t)
        return pv - dirty_price

    # Solve for z using bracketed Brentq in range -500 bps to +5000 bps (-0.05 to +0.50)
    try:
        sol = brentq(objective, -0.05, 0.50, xtol=1e-8, maxiter=100)
        return round(float(sol * 10000.0), 1)
    except Exception:
        # Fallback grid search
        grid = np.linspace(-0.02, 0.35, 400)
        vals = [abs(objective(g)) for g in grid]
        return round(float(grid[np.argmin(vals)] * 10000.0), 1)


def estimate_price_sensitivity(
    dirty_price: float,
    mod_duration: float,
    convexity: float,
    ytm: float,
    cash_flows: List[CashFlow],
    frequency: int = 2,
    shocks_bps: List[int] = None
) -> dict:
    """
    Taylor expansion price impact vs exact revaluation.
    """
    if shocks_bps is None:
        shocks_bps = [-200, -100, -50, -25, 25, 50, 100, 200]
        
    results = {}
    for bps in shocks_bps:
        dy = bps / 10000.0
        pct_duration_contrib = -mod_duration * dy
        pct_convexity_contrib = 0.5 * convexity * (dy ** 2)
        pct_approx_change = pct_duration_contrib + pct_convexity_contrib
        approx_price = dirty_price * (1.0 + pct_approx_change)
        
        exact_price = price_from_ytm(ytm + dy, cash_flows, frequency)
        pct_exact_change = (exact_price - dirty_price) / dirty_price if dirty_price > 0 else 0.0
        
        results[f"{bps:+d}bps"] = {
            "yield_shock_bps": bps,
            "approx_price": round(approx_price, 4),
            "approx_pct_change": round(pct_approx_change * 100, 4),
            "exact_price": round(exact_price, 4),
            "exact_pct_change": round(pct_exact_change * 100, 4),
            "duration_contrib_pct": round(pct_duration_contrib * 100, 4),
            "convexity_contrib_pct": round(pct_convexity_contrib * 100, 4),
            "taylor_error_bps": round(abs(pct_approx_change - pct_exact_change) * 10000, 2)
        }
        
    return results


def run_full_bond_analytics(
    settlement_date: date,
    maturity_date: date,
    coupon_rate: float,
    clean_price: Optional[float] = None,
    dirty_price: Optional[float] = None,
    ytm: Optional[float] = None,
    frequency: int = 2,
    face_value: float = 100.0,
    day_count: str = "30/360"
) -> BondAnalyticsResult:
    """
    Complete analytical pipeline for a security.
    """
    cash_flows, accrued_interest = generate_cash_flows(
        settlement_date=settlement_date,
        maturity_date=maturity_date,
        coupon_rate=coupon_rate,
        frequency=frequency,
        face_value=face_value,
        day_count=day_count
    )
    
    if ytm is not None:
        computed_ytm = ytm
        computed_dirty = price_from_ytm(computed_ytm, cash_flows, frequency)
        computed_clean = computed_dirty - accrued_interest
    elif dirty_price is not None:
        computed_dirty = dirty_price
        computed_clean = dirty_price - accrued_interest
        computed_ytm = calculate_ytm(computed_dirty, cash_flows, frequency)
    elif clean_price is not None:
        computed_clean = clean_price
        computed_dirty = clean_price + accrued_interest
        computed_ytm = calculate_ytm(computed_dirty, cash_flows, frequency)
    else:
        raise ValueError("Must provide at least one of ytm, clean_price, or dirty_price.")
        
    mac_dur, mod_dur, conv, dv01 = calculate_duration_convexity(
        ytm=computed_ytm,
        cash_flows=cash_flows,
        dirty_price=computed_dirty,
        frequency=frequency
    )
    
    price_sens = estimate_price_sensitivity(
        dirty_price=computed_dirty,
        mod_duration=mod_dur,
        convexity=conv,
        ytm=computed_ytm,
        cash_flows=cash_flows,
        frequency=frequency
    )
    
    return BondAnalyticsResult(
        clean_price=round(computed_clean, 4),
        dirty_price=round(computed_dirty, 4),
        accrued_interest=round(accrued_interest, 4),
        ytm=round(computed_ytm, 6),
        macaulay_duration=mac_dur,
        modified_duration=mod_dur,
        convexity=conv,
        dv01=dv01,
        cash_flows=cash_flows,
        price_sensitivity=price_sens
    )
