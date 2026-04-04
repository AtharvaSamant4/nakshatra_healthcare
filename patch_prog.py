from uuid import UUID

def add():
    with open('backend/app/routers/progress.py', 'a', encoding='utf-8') as f:
        f.write('\n@router.get("/{user_id}/improvement")\ndef get_improvement(user_id: UUID):\n    return progress_service.get_improvement(str(user_id))\n')

add()
