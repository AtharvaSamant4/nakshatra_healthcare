with open("backend/app/models/patient_models.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "injury_type: Optional[str] = None\n    severity: Optional[str] = None",
    "injury_type: Optional[str] = None\n    severity: Optional[str] = None\n    has_alert: bool = False"
)

with open("backend/app/models/patient_models.py", "w", encoding="utf-8") as f:
    f.write(text)
