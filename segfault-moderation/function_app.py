import azure.functions as func
import logging
import json
import os
import requests
from io import BytesIO
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import google.generativeai as genai
from math import radians, cos, sin, asin, sqrt
import psycopg2

app = func.FunctionApp()

DATABASE_URL = os.environ.get("DATABASE_URL")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
LOCATION_THRESHOLD_METERS = 100

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000
    return c * r

def get_decimal_coords(gps_info: dict) -> tuple[float, float] | None:
    try:
        lat = gps_info.get("GPSLatitude")
        lat_ref = gps_info.get("GPSLatitudeRef")
        lon = gps_info.get("GPSLongitude")
        lon_ref = gps_info.get("GPSLongitudeRef")
        
        if not all([lat, lat_ref, lon, lon_ref]):
            return None
        
        lat_decimal = lat[0] + lat[1]/60 + lat[2]/3600
        if lat_ref == "S":
            lat_decimal = -lat_decimal
            
        lon_decimal = lon[0] + lon[1]/60 + lon[2]/3600
        if lon_ref == "W":
            lon_decimal = -lon_decimal
            
        return (lat_decimal, lon_decimal)
    except Exception:
        return None

def extract_gps_from_image(image_bytes: bytes) -> tuple[float, float] | None:
    try:
        image = Image.open(BytesIO(image_bytes))
        exif_data = image._getexif()
        
        if not exif_data:
            return None
        
        gps_info = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value
        
        return get_decimal_coords(gps_info)
    except Exception:
        return None

def analyze_with_gemini(image_bytes: bytes, issue_type: str) -> dict:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    prompt = f"""Analyze this image for a civic issue report of type: {issue_type}

Evaluate:
1. SAFETY: Is this image NSFW, violent, or abusive?
2. RELEVANCE: Does this appear to match the reported issue type?
3. SEVERITY: Rate urgency 1-5 (1=Minor, 5=Critical/Blocking)

Respond ONLY with valid JSON:
{{"safe": true/false, "relevant": true/false, "severity": 1-5}}"""

    image = Image.open(BytesIO(image_bytes))
    response = model.generate_content([prompt, image])
    
    try:
        result_text = response.text.strip()
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        return json.loads(result_text)
    except Exception as e:
        logging.error(f"Failed to parse Gemini response: {e}")
        return {"safe": True, "relevant": True, "severity": 3}

def update_issue(issue_id: int, authorized: bool, error: str, severity: int | None):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    authorized_val = "TRUE" if authorized else "FALSE"
    
    if severity is not None:
        cursor.execute(
            'UPDATE "Issue" SET authorized = %s, error = %s, severity = %s WHERE id = %s',
            (authorized_val, error, severity, issue_id)
        )
    else:
        cursor.execute(
            'UPDATE "Issue" SET authorized = %s, error = %s WHERE id = %s',
            (authorized_val, error, issue_id)
        )
    
    conn.commit()
    cursor.close()
    conn.close()

@app.queue_trigger(arg_name="msg", queue_name="issue-moderation", connection="AzureWebJobsStorage")
def moderate_issue(msg: func.QueueMessage):
    try:
        data = json.loads(msg.get_body().decode("utf-8"))
        issue_id = data["issueId"]
        blob_url = data["blobUrl"]
        reported_lat = data["latitude"]
        reported_lng = data["longitude"]
        issue_type = data["issueType"]
        
        logging.info(f"Processing issue {issue_id}")
        
        response = requests.get(blob_url, timeout=30)
        response.raise_for_status()
        image_bytes = response.content
        
        image_gps = extract_gps_from_image(image_bytes)
        
        if image_gps:
            distance = haversine(image_gps[1], image_gps[0], reported_lng, reported_lat)
            logging.info(f"GPS distance: {distance:.0f}m")
            
            if distance > LOCATION_THRESHOLD_METERS:
                logging.warning(f"Issue {issue_id}: Location mismatch ({distance:.0f}m)")
                update_issue(issue_id, False, "INVALID_LOCATION", None)
                return
        
        result = analyze_with_gemini(image_bytes, issue_type)
        
        if not result.get("safe", True):
            logging.warning(f"Issue {issue_id}: Content violation")
            update_issue(issue_id, False, "INAPPROPRIATE_CONTENT", None)
            return
        
        severity = result.get("severity", 3)
        severity = max(1, min(5, severity))
        
        logging.info(f"Issue {issue_id}: Approved with severity {severity}")
        update_issue(issue_id, True, "NONE", severity)
        
    except Exception as e:
        logging.error(f"Moderation failed: {e}")
        raise
