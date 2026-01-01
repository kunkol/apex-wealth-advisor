"""
Google Calendar Tools
Accesses Google Calendar API via Auth0 Token Vault
"""

import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
import requests

logger = logging.getLogger(__name__)

# Default timezone - can be overridden via environment variable
DEFAULT_TIMEZONE = os.getenv("CALENDAR_TIMEZONE", "America/Los_Angeles")


class GoogleCalendarTools:
    """
    Google Calendar integration via Auth0 Token Vault.
    
    Security Flow:
    1. User authenticates with Okta
    2. Backend exchanges Okta token for Auth0 vault token (CTE)
    3. Backend retrieves Google token from Token Vault
    4. Backend calls Google Calendar API with user's Google token
    """
    
    def __init__(self, token_vault_client=None):
        self.token_vault = token_vault_client
        self.calendar_api_base = "https://www.googleapis.com/calendar/v3"
        
        # Mock data for demo (used when Token Vault not configured)
        self.mock_events = self._initialize_mock_events()
    
    def _initialize_mock_events(self) -> List[Dict[str, Any]]:
        """Initialize mock calendar data for demo"""
        today = datetime.now()
        return [
            {
                "id": "evt001",
                "summary": "Portfolio Review - Marcus Thompson",
                "description": "Quarterly portfolio review meeting",
                "start": {"dateTime": (today + timedelta(days=2, hours=10)).isoformat()},
                "end": {"dateTime": (today + timedelta(days=2, hours=11)).isoformat()},
                "attendees": [{"email": "marcus.thompson@email.com", "displayName": "Marcus Thompson"}],
                "status": "confirmed"
            },
            {
                "id": "evt002", 
                "summary": "Retirement Planning - Elena Rodriguez",
                "description": "Discuss retirement income strategy",
                "start": {"dateTime": (today + timedelta(days=3, hours=14)).isoformat()},
                "end": {"dateTime": (today + timedelta(days=3, hours=15)).isoformat()},
                "attendees": [{"email": "elena.rodriguez@email.com", "displayName": "Elena Rodriguez"}],
                "status": "confirmed"
            },
            {
                "id": "evt003",
                "summary": "Business Succession Planning - James Chen",
                "description": "Review business succession options",
                "start": {"dateTime": (today + timedelta(days=5, hours=9)).isoformat()},
                "end": {"dateTime": (today + timedelta(days=5, hours=10, minutes=30)).isoformat()},
                "attendees": [{"email": "jchen@chenindustries.com", "displayName": "James Chen"}],
                "status": "confirmed"
            },
            {
                "id": "evt004",
                "summary": "Investment Strategy Call - Priya Patel",
                "description": "Discuss growth portfolio adjustments",
                "start": {"dateTime": (today + timedelta(days=1, hours=16)).isoformat()},
                "end": {"dateTime": (today + timedelta(days=1, hours=16, minutes=30)).isoformat()},
                "attendees": [{"email": "priya.patel@email.com", "displayName": "Priya Patel"}],
                "status": "confirmed"
            },
            {
                "id": "evt005",
                "summary": "Team Standup",
                "description": "Daily team sync",
                "start": {"dateTime": (today + timedelta(days=1, hours=9)).isoformat()},
                "end": {"dateTime": (today + timedelta(days=1, hours=9, minutes=30)).isoformat()},
                "attendees": [],
                "status": "confirmed"
            }
        ]
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """Return tool definitions for Claude"""
        return [
            {
                "name": "list_calendar_events",
                "description": "List upcoming calendar events. Shows meetings scheduled in the next 7 days by default.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days_ahead": {
                            "type": "integer",
                            "description": "Number of days to look ahead (default: 7)"
                        },
                        "search_query": {
                            "type": "string",
                            "description": "Optional search query to filter events by title or attendee name"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "get_calendar_event",
                "description": "Get details of a specific calendar event by ID",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "The calendar event ID"
                        }
                    },
                    "required": ["event_id"]
                }
            },
            {
                "name": "create_calendar_event",
                "description": "Schedule a new meeting or event on the calendar",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Event title/summary"
                        },
                        "description": {
                            "type": "string",
                            "description": "Event description"
                        },
                        "start_time": {
                            "type": "string",
                            "description": "Start time in ISO format or natural language (e.g., 'next Tuesday at 2pm')"
                        },
                        "duration_minutes": {
                            "type": "integer",
                            "description": "Duration in minutes (default: 60)"
                        },
                        "attendee_email": {
                            "type": "string",
                            "description": "Email of attendee to invite"
                        },
                        "attendee_name": {
                            "type": "string",
                            "description": "Name of attendee"
                        }
                    },
                    "required": ["title", "start_time"]
                }
            },
            {
                "name": "check_availability",
                "description": "Check if a specific time slot is available",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "Date to check (e.g., 'tomorrow', 'Friday', '2025-01-15')"
                        },
                        "time": {
                            "type": "string",
                            "description": "Time to check (e.g., '2pm', '14:00')"
                        }
                    },
                    "required": ["date"]
                }
            },
            {
                "name": "cancel_calendar_event",
                "description": "Cancel/delete a calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "The calendar event ID to cancel"
                        }
                    },
                    "required": ["event_id"]
                }
            }
        ]
    
    async def call_tool(self, tool_name: str, args: Dict[str, Any], google_token: Optional[str] = None) -> Dict[str, Any]:
        """Execute a calendar tool"""
        
        # Add Token Vault info to response
        token_vault_info = {
            "security_flow": "Auth0 Token Vault",
            "token_source": "google-oauth2 connection",
            "token_available": bool(google_token)
        }
        
        tool_handlers = {
            "list_calendar_events": self._list_events,
            "get_calendar_event": self._get_event,
            "create_calendar_event": self._create_event,
            "check_availability": self._check_availability,
            "cancel_calendar_event": self._cancel_event
        }
        
        handler = tool_handlers.get(tool_name)
        if not handler:
            return {"error": "unknown_tool", "message": f"Tool '{tool_name}' not found"}
        
        result = await handler(args, google_token)
        result["token_vault_info"] = token_vault_info
        return result
    
    async def _list_events(self, args: Dict[str, Any], google_token: Optional[str]) -> Dict[str, Any]:
        """List calendar events"""
        days_ahead = args.get("days_ahead", 7)
        search_query = args.get("search_query", "").lower()
        
        # If we have a real token, call Google API
        if google_token:
            try:
                # Use UTC for API calls, let Google handle timezone conversion
                now_utc = datetime.now(timezone.utc)
                time_max_utc = now_utc + timedelta(days=days_ahead)
                
                logger.info(f"[Google Calendar] Calling events.list API (next {days_ahead} days)")
                logger.info(f"[Google Calendar] timeMin: {now_utc.isoformat()}, timeMax: {time_max_utc.isoformat()}")
                
                result = await self._call_google_api(
                    "GET",
                    f"/calendars/primary/events",
                    google_token,
                    params={
                        "maxResults": 50,
                        "orderBy": "startTime",
                        "singleEvents": True,
                        "timeMin": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "timeMax": time_max_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "timeZone": DEFAULT_TIMEZONE
                    }
                )
                
                events = result.get("items", [])
                logger.info(f"[Google Calendar] SUCCESS: Retrieved {len(events)} events from real Google Calendar")
                
                # Filter by search query if provided
                if search_query:
                    events = [
                        e for e in events 
                        if search_query in e.get("summary", "").lower() or
                           any(search_query in a.get("displayName", "").lower() for a in e.get("attendees", []))
                    ]
                    logger.info(f"[Google Calendar] Filtered to {len(events)} events matching '{search_query}'")
                
                return {
                    "events": events,
                    "count": len(events),
                    "days_ahead": days_ahead,
                    "timezone": DEFAULT_TIMEZONE,
                    "source": "Google Calendar (via Auth0 Token Vault)"
                }
            except Exception as e:
                logger.warning(f"[Google Calendar] API call failed, using mock data: {e}")
        
        # Use mock data
        logger.info("[Google Calendar] Using MOCK data (no token or API failed)")
        events = self.mock_events
        
        # Filter by search query
        if search_query:
            events = [
                e for e in events 
                if search_query in e.get("summary", "").lower() or
                   any(search_query in a.get("displayName", "").lower() for a in e.get("attendees", []))
            ]
        
        return {
            "events": events,
            "count": len(events),
            "days_ahead": days_ahead,
            "source": "Demo Data (Mock)"
        }
    
    async def _get_event(self, args: Dict[str, Any], google_token: Optional[str]) -> Dict[str, Any]:
        """Get specific event details"""
        event_id = args.get("event_id")
        
        if google_token:
            try:
                logger.info(f"[Google Calendar] Getting event: {event_id}")
                result = await self._call_google_api(
                    "GET",
                    f"/calendars/primary/events/{event_id}",
                    google_token
                )
                logger.info(f"[Google Calendar] SUCCESS: Retrieved event '{result.get('summary', 'Unknown')}'")
                return {"event": result, "source": "Google Calendar (via Auth0 Token Vault)"}
            except Exception as e:
                logger.warning(f"[Google Calendar] API call failed, using mock data: {e}")
        
        # Mock lookup
        for event in self.mock_events:
            if event["id"] == event_id:
                return {"event": event, "source": "Demo Data"}
        
        return {"error": "not_found", "message": f"Event '{event_id}' not found"}
    
    def _parse_time_string(self, time_str: str) -> int:
        """Parse time string like '11am', '2pm', '14:00' into hour (24h format)"""
        time_str = time_str.lower().strip()
        
        # Handle 24h format like "14:00"
        if ":" in time_str:
            parts = time_str.replace("am", "").replace("pm", "").split(":")
            hour = int(parts[0])
            if "pm" in time_str.lower() and hour != 12:
                hour += 12
            return hour
        
        # Handle "11am", "2pm" format
        if "pm" in time_str:
            hour = int(time_str.replace("pm", "").strip())
            if hour != 12:
                hour += 12
            return hour
        elif "am" in time_str:
            hour = int(time_str.replace("am", "").strip())
            if hour == 12:
                hour = 0
            return hour
        
        # Just a number, assume it's the hour
        try:
            return int(time_str)
        except:
            return 14  # Default 2pm
    
    def _parse_timezone(self, start_time: str) -> str:
        """Extract timezone from string, return timezone name"""
        start_time_lower = start_time.lower()
        
        # Map common timezone mentions to timezone names
        tz_map = {
            'ist': 'Asia/Kolkata',
            'india': 'Asia/Kolkata',
            'indian': 'Asia/Kolkata',
            'pst': 'America/Los_Angeles',
            'pacific': 'America/Los_Angeles',
            'pt': 'America/Los_Angeles',
            'est': 'America/New_York',
            'eastern': 'America/New_York',
            'et': 'America/New_York',
            'cst': 'America/Chicago',
            'central': 'America/Chicago',
            'ct': 'America/Chicago',
            'mst': 'America/Denver',
            'mountain': 'America/Denver',
            'mt': 'America/Denver',
            'utc': 'UTC',
            'gmt': 'UTC',
        }
        
        for tz_key, tz_value in tz_map.items():
            if tz_key in start_time_lower:
                logger.info(f"[Google Calendar] Detected timezone: {tz_key} -> {tz_value}")
                return tz_value
        
        return DEFAULT_TIMEZONE
    
    def _parse_date_time(self, start_time: str) -> tuple:
        """Parse natural language date/time into datetime object and timezone"""
        import re
        
        start_time_lower = start_time.lower()
        now = datetime.now()
        
        # Extract timezone first
        user_timezone = self._parse_timezone(start_time)
        
        logger.info(f"[Google Calendar] Parsing date/time: '{start_time}' (timezone: {user_timezone})")
        
        # Try ISO format first
        try:
            dt = datetime.fromisoformat(start_time.replace("Z", ""))
            logger.info(f"[Google Calendar] Parsed as ISO format: {dt}")
            return dt, user_timezone
        except:
            pass
        
        # Extract time component FIRST - look for patterns like "10am", "2pm", "at 10am", "at 2:30pm"
        # Must have am/pm or be preceded by "at" to distinguish from date numbers
        hour = 14  # Default 2pm
        minute = 0
        
        # Pattern: "at X" or "Xam" or "Xpm" or "X:XX"
        time_match = re.search(r'(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)', start_time_lower)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2)) if time_match.group(2) else 0
            ampm = time_match.group(3)
            if ampm == 'pm' and hour != 12:
                hour += 12
            elif ampm == 'am' and hour == 12:
                hour = 0
            logger.info(f"[Google Calendar] Extracted time: {hour}:{minute:02d}")
        else:
            # Try "at X" without am/pm (assume 24h or contextual)
            at_match = re.search(r'at\s+(\d{1,2})(?::(\d{2}))?(?!\d)', start_time_lower)
            if at_match:
                hour = int(at_match.group(1))
                minute = int(at_match.group(2)) if at_match.group(2) else 0
                # If hour <= 12 and no am/pm, assume PM for business hours
                if hour <= 12 and hour >= 1:
                    if hour < 8:  # 1-7 likely means PM
                        hour += 12
                logger.info(f"[Google Calendar] Extracted time (at X): {hour}:{minute:02d}")
        
        # Handle relative dates
        if "tomorrow" in start_time_lower:
            dt = now + timedelta(days=1)
            dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
            logger.info(f"[Google Calendar] Parsed 'tomorrow' as: {dt}")
            return dt, user_timezone
        
        if "today" in start_time_lower:
            dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            logger.info(f"[Google Calendar] Parsed 'today' as: {dt}")
            return dt, user_timezone
        
        # Handle day names (Monday, Tuesday, etc.)
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for i, day in enumerate(days):
            if day in start_time_lower:
                current_day = now.weekday()
                days_ahead = i - current_day
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                if "next" in start_time_lower:
                    days_ahead += 7
                dt = now + timedelta(days=days_ahead)
                dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
                logger.info(f"[Google Calendar] Parsed '{day}' as: {dt}")
                return dt, user_timezone
        
        # Handle month + day format (e.g., "January 4th", "Jan 4", "1/4")
        months = {
            "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
            "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
            "august": 8, "aug": 8, "september": 9, "sep": 9, "october": 10, "oct": 10,
            "november": 11, "nov": 11, "december": 12, "dec": 12
        }
        
        for month_name, month_num in months.items():
            if month_name in start_time_lower:
                # Extract day number
                day_match = re.search(r'(\d{1,2})(?:st|nd|rd|th)?', start_time_lower)
                if day_match:
                    day = int(day_match.group(1))
                    
                    # Check if year is explicitly specified (e.g., "2026", "2025")
                    year_match = re.search(r'\b(20\d{2})\b', start_time)
                    if year_match:
                        year = int(year_match.group(1))
                        logger.info(f"[Google Calendar] Explicit year found: {year}")
                    else:
                        # Determine year - only use next year if date has passed AND no explicit year
                        year = now.year
                        test_date = datetime(year, month_num, day)
                        if test_date < now:
                            year += 1
                    
                    dt = datetime(year, month_num, day, hour, minute, 0)
                    logger.info(f"[Google Calendar] Parsed '{month_name} {day}' as: {dt} ({user_timezone})")
                    return dt, user_timezone
        
        # Handle numeric date format (1/4, 01/04)
        date_match = re.search(r'(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?', start_time)
        if date_match:
            month = int(date_match.group(1))
            day = int(date_match.group(2))
            year = int(date_match.group(3)) if date_match.group(3) else now.year
            if year < 100:
                year += 2000
            dt = datetime(year, month, day, hour, minute, 0)
            logger.info(f"[Google Calendar] Parsed numeric date as: {dt}")
            return dt, user_timezone
        
        # Default: tomorrow at the extracted/default time
        dt = now + timedelta(days=1)
        dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
        logger.info(f"[Google Calendar] Could not parse, defaulting to tomorrow: {dt}")
        return dt, user_timezone

    async def _create_event(self, args: Dict[str, Any], google_token: Optional[str]) -> Dict[str, Any]:
        """Create a new calendar event"""
        title = args.get("title")
        description = args.get("description", "")
        start_time = args.get("start_time", "tomorrow at 2pm")
        duration = args.get("duration_minutes", 60)
        attendee_email = args.get("attendee_email")
        attendee_name = args.get("attendee_name", "")
        
        # Parse start time with improved parser - returns (datetime, timezone)
        start_dt, event_timezone = self._parse_date_time(start_time)
        end_dt = start_dt + timedelta(minutes=duration)
        
        logger.info(f"[Google Calendar] Creating event '{title}' at {start_dt.isoformat()} ({event_timezone})")
        
        event_data = {
            "summary": title,
            "description": description,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": event_timezone},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": event_timezone},
            "attendees": [{"email": attendee_email, "displayName": attendee_name}] if attendee_email else []
        }
        
        if google_token:
            try:
                logger.info(f"[Google Calendar] Creating event: {title}")
                result = await self._call_google_api(
                    "POST",
                    f"/calendars/primary/events",
                    google_token,
                    json_data=event_data
                )
                logger.info(f"[Google Calendar] SUCCESS: Created event '{title}' with ID {result.get('id')}")
                return {
                    "status": "created",
                    "event": result,
                    "message": f"Meeting '{title}' scheduled for {start_dt.strftime('%B %d at %I:%M %p')}",
                    "source": "Google Calendar (via Auth0 Token Vault)"
                }
            except Exception as e:
                logger.warning(f"[Google Calendar] API call failed, using mock: {e}")
        
        # Mock creation
        new_event = {
            "id": f"evt{len(self.mock_events) + 1:03d}",
            "summary": title,
            "description": description,
            "start": {"dateTime": start_dt.isoformat()},
            "end": {"dateTime": end_dt.isoformat()},
            "attendees": event_data["attendees"],
            "status": "confirmed"
        }
        self.mock_events.append(new_event)
        
        return {
            "status": "created",
            "event": new_event,
            "message": f"Meeting '{title}' scheduled for {start_dt.strftime('%B %d at %I:%M %p')}",
            "source": "Demo Data (Mock)"
        }
    
    async def _check_availability(self, args: Dict[str, Any], google_token: Optional[str]) -> Dict[str, Any]:
        """Check availability for a time slot"""
        date_str = args.get("date", "tomorrow")
        time_str = args.get("time", "")
        
        # Parse date (simplified)
        if "tomorrow" in date_str.lower():
            check_date = datetime.now() + timedelta(days=1)
        elif "friday" in date_str.lower():
            check_date = datetime.now()
            while check_date.weekday() != 4:  # Friday
                check_date += timedelta(days=1)
        else:
            check_date = datetime.now() + timedelta(days=1)
        
        # Parse time
        if time_str:
            if "pm" in time_str.lower():
                hour = int(time_str.replace("pm", "").strip())
                if hour != 12:
                    hour += 12
            elif "am" in time_str.lower():
                hour = int(time_str.replace("am", "").strip())
            else:
                hour = 14  # Default 2pm
            check_date = check_date.replace(hour=hour, minute=0)
        
        # Check against mock events (simplified)
        conflicts = []
        for event in self.mock_events:
            event_start = datetime.fromisoformat(event["start"]["dateTime"].replace("Z", "").split("+")[0])
            if event_start.date() == check_date.date():
                if abs((event_start - check_date).total_seconds()) < 3600:  # Within 1 hour
                    conflicts.append(event)
        
        if conflicts:
            return {
                "available": False,
                "message": f"You have a conflict at that time: {conflicts[0]['summary']}",
                "conflicts": conflicts,
                "suggestion": "Would you like me to find an alternative time?"
            }
        else:
            return {
                "available": True,
                "message": f"You are free on {check_date.strftime('%B %d at %I:%M %p')}",
                "date": check_date.isoformat()
            }
    
    async def _cancel_event(self, args: Dict[str, Any], google_token: Optional[str]) -> Dict[str, Any]:
        """Cancel a calendar event"""
        event_id = args.get("event_id")
        
        if google_token:
            try:
                logger.info(f"[Google Calendar] Cancelling event: {event_id}")
                await self._call_google_api(
                    "DELETE",
                    f"/calendars/primary/events/{event_id}",
                    google_token
                )
                logger.info(f"[Google Calendar] SUCCESS: Cancelled event {event_id}")
                return {"status": "cancelled", "event_id": event_id, "source": "Google Calendar (via Auth0 Token Vault)"}
            except Exception as e:
                logger.warning(f"[Google Calendar] API call failed: {e}")
        
        # Mock cancellation
        for i, event in enumerate(self.mock_events):
            if event["id"] == event_id:
                cancelled = self.mock_events.pop(i)
                return {
                    "status": "cancelled",
                    "event": cancelled,
                    "message": f"Meeting '{cancelled['summary']}' has been cancelled"
                }
        
        return {"error": "not_found", "message": f"Event '{event_id}' not found"}
    
    async def _call_google_api(
        self, 
        method: str, 
        endpoint: str, 
        token: str,
        params: Dict = None,
        json_data: Dict = None
    ) -> Dict[str, Any]:
        """Make authenticated call to Google Calendar API"""
        url = f"{self.calendar_api_base}{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"[Google API] {method} {endpoint}")
        
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if resp.status_code >= 400:
            logger.error(f"[Google API] Error: {resp.status_code} - {resp.text}")
            raise Exception(f"Google API error: {resp.status_code}")
        
        logger.info(f"[Google API] Success: {resp.status_code}")
        return resp.json() if resp.text else {"status": "success"}
