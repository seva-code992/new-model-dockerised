import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ReportPayload(BaseModel):
    issue_description: str
    species: Optional[str] = "N/A"
    query: Optional[str] = "N/A"
    current_url: Optional[str] = "N/A"

# Configuration
# Configuration
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "plantgeniereports@gmail.com").strip().strip('"')
raw_password = os.getenv("SENDER_PASSWORD", "")
SENDER_PASSWORD = raw_password.replace(" ", "").strip().strip('"') if raw_password else ""
TARGET_EMAIL = "sets0003@student.umu.se"     
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@router.post("/api/report")
def send_report(data: ReportPayload):
    if not data.issue_description.strip():
        raise HTTPException(status_code=400, detail="Report description cannot be empty.")

    try:
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = TARGET_EMAIL
        msg["Subject"] = "Report"  

        # Rich text body including automatic contextual metadata
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        body = f"""New User Report Submitted
----------------------------------------
Date/Time: {timestamp}
Active Species: {data.species}
Search Query: {data.query}
Page URL: {data.current_url}

User Comments:
{data.issue_description}
----------------------------------------
"""
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()

        return {"status": "success"}
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send report.")