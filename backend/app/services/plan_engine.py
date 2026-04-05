"""Basic adaptive exercise plan hints from injury label and performance score."""


def generate_basic_plan(injury: str, score: int) -> list:
    """
    Returns a list of suggested exercise identifiers (strings).
    ACL branch uses score thresholds; all other injuries get a safe default.
    """
    normalized = (injury or "").strip().upper()
    if normalized == "ACL":
        if score < 40:
            return ["leg_raise", "assisted_knee_extension"]
        if score < 70:
            return ["knee_extension", "partial_squat"]
        return ["full_squat", "step_up"]
    return ["basic_mobility"]
