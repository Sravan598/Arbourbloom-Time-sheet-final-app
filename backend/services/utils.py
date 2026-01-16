from datetime import datetime


def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings"""
    if isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def deserialize_datetime(obj, fields):
    """Convert ISO format strings back to datetime objects for specified fields"""
    if isinstance(obj, dict):
        result = obj.copy()
        for field in fields:
            if field in result and result[field]:
                if isinstance(result[field], str):
                    try:
                        result[field] = datetime.fromisoformat(result[field].replace('Z', '+00:00'))
                    except ValueError:
                        pass
        return result
    return obj
