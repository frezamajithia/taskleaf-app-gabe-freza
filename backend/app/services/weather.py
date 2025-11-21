"""
Weather API service using OpenWeatherMap
"""
import httpx
from typing import Optional, Dict
from app.core.config import settings


class WeatherService:
    """Service for fetching weather data from OpenWeatherMap API"""
    
    def __init__(self):
        self.api_key = settings.OPENWEATHER_API_KEY
        self.base_url = settings.OPENWEATHER_BASE_URL
    
    async def get_weather(self, location: str) -> Optional[Dict]:
        """
        Get current weather for a location

        Args:
            location: City name or "lat,lon" coordinates

        Returns:
            Weather data dictionary or None if error
        """
        if not self.api_key:
            print(f"⚠️  Weather API: No API key configured")
            return None

        print(f"🌤️  Fetching weather for: {location}")
        try:
            async with httpx.AsyncClient() as client:
                # Check if location is coordinates
                if "," in location:
                    lat, lon = location.split(",")
                    url = f"{self.base_url}/weather"
                    params = {
                        "lat": lat.strip(),
                        "lon": lon.strip(),
                        "appid": self.api_key,
                        "units": "metric"
                    }
                else:
                    url = f"{self.base_url}/weather"
                    params = {
                        "q": location,
                        "appid": self.api_key,
                        "units": "metric"
                    }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                # Extract relevant weather data
                weather_result = {
                    "temperature": data["main"]["temp"],
                    "feels_like": data["main"]["feels_like"],
                    "description": data["weather"][0]["description"],
                    "icon": data["weather"][0]["icon"],
                    "humidity": data["main"]["humidity"],
                    "wind_speed": data["wind"]["speed"],
                    "location": data["name"]
                }
                print(f"✅ Weather data fetched successfully: {weather_result['temperature']}°C, {weather_result['description']}")
                return weather_result
        except Exception as e:
            print(f"❌ Weather API error: {e}")
            return None
    
    async def get_forecast(self, location: str, days: int = 5) -> Optional[Dict]:
        """
        Get weather forecast for a location
        
        Args:
            location: City name
            days: Number of days (max 5 for free tier)
            
        Returns:
            Forecast data or None if error
        """
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/forecast"
                params = {
                    "q": location,
                    "appid": self.api_key,
                    "units": "metric",
                    "cnt": days * 8  # 8 data points per day (3-hour intervals)
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Weather forecast API error: {e}")
            return None


# Singleton instance
weather_service = WeatherService()
