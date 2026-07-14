from app.repositories.analytics import (
    get_pulse_stats, get_radar_data, get_buyer_intelligence, get_competitive_signals,
)
from app.schemas.analytics import PulseStats, RadarData, BuyerIntelligence, CompetitiveSignals

def get_pulse() -> PulseStats:
    return PulseStats(**get_pulse_stats())

def get_radar() -> RadarData:
    return RadarData(**get_radar_data())

def get_buyers() -> BuyerIntelligence:
    return BuyerIntelligence(**get_buyer_intelligence())

def get_signals() -> CompetitiveSignals:
    return CompetitiveSignals(**get_competitive_signals())
