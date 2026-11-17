import { Link } from 'react-router';
import { dismissNotice, useNoticeStore } from '../notices.js';
import Toast from './Toast.jsx';

const actionClass =
  'flex min-h-11 shrink-0 items-center rounded-lg px-3 text-label-sm text-primary transition-colors hover:bg-surface';

/** Muestra el aviso global (ver notices.js). Va una sola vez, en el layout de la aplicación. */
export default function NoticeHost() {
  const notice = useNoticeStore((state) => state.notice);
  if (!notice) return null;
  const { action } = notice;

  return (
    <Toast key={notice.id} message={notice.message} tone={notice.tone} onClose={dismissNotice}>
      {action?.to && (
        <Link to={action.to} onClick={dismissNotice} className={actionClass}>
          {action.label}
        </Link>
      )}
      {action?.onClick && (
        <button
          type="button"
          onClick={() => {
            dismissNotice();
            action.onClick();
          }}
          className={actionClass}
        >
          {action.label}
        </button>
      )}
    </Toast>
  );
}
