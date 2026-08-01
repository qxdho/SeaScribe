# SeaScribe API route handlers — 聚合入口
#
# v6.0.0 起按功能域拆分到独立模块，本文件仅做 import 聚合与 handler 列表组装：
#   api_auth.py    鉴权与会话（登录/登出/会话/注册/会话管理）
#   api_user.py    用户管理（列表/详情/资料/创建/修改/删除/头像查询）
#   api_roster.py  花名册（班级列表/详情/读写/用户班级/签名）
#   api_picker.py  点名（上次点名/时间戳读写/记录）
#   api_config.py  配置（读/存）
#   api_file.py    文件（学科文件/英语上传删除/头像上传服务）
#   api_log.py     日志（正常/debug）
#   api_common.py  公共辅助
#
# 新增 handler：在对应模块实现后，追加到下方 GET_HANDLERS / POST_HANDLERS。

from .api_auth import (
    handle_admin_register, handle_admin_login, handle_admin_logout,
    handle_admin_session, handle_admin_sessions, handle_admin_sessions_delete,
)
from .api_user import (
    handle_admin_users_get, handle_admin_user_get, handle_admin_avatar,
    handle_admin_profile, handle_admin_user_create, handle_admin_user_modify,
)
from .api_roster import (
    handle_roster_classes, handle_roster_get, handle_admin_roster,
    handle_roster_save, handle_user_class, handle_user_signatures,
)
from .api_picker import (
    handle_user_last_pick, handle_picker_timestamps_get,
    handle_picker_timestamps_post, handle_picker_timestamps_delete,
    handle_picker_timestamps_clear, handle_admin_records,
)
from .api_config import handle_admin_config_get, handle_admin_config_save
from .api_file import (
    handle_get_files, handle_admin_english_files,
    handle_english_upload, handle_english_delete,
    handle_avatar_upload, handle_avatar_file,
)
from .api_log import handle_admin_logs, handle_admin_logs_debug


GET_HANDLERS = [
    handle_get_files,
    handle_roster_classes,
    handle_roster_get,
    handle_user_last_pick,
    handle_user_class,
    handle_admin_roster,
    handle_user_signatures,
    handle_picker_timestamps_get,
    handle_admin_session,
    handle_admin_users_get,
    handle_admin_user_get,
    handle_admin_avatar,
    handle_avatar_file,
    handle_admin_sessions,
    handle_admin_logs,
    handle_admin_logs_debug,
    handle_admin_config_get,
    handle_admin_records,
    handle_admin_english_files,
]

POST_HANDLERS = [
    handle_admin_register,
    handle_admin_login,
    handle_admin_logout,
    handle_admin_profile,
    handle_admin_user_create,
    handle_admin_user_modify,
    handle_admin_config_save,
    handle_roster_save,
    handle_picker_timestamps_post,
    handle_picker_timestamps_delete,
    handle_picker_timestamps_clear,
    handle_english_upload,
    handle_english_delete,
    handle_admin_sessions_delete,
    handle_avatar_upload,
]
