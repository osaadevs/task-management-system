import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { PinIcon } from './Icons';
import { canOpenTask, getTaskPath } from '../utils/notificationNavigation';

function pickAssignmentAlert(notifications) {
  return (notifications || []).find(
    (item) => !item.is_read && item.type === 'assignment' && canOpenTask(item)
  );
}

export default function AssignmentAlert() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await api.getNotifications();
        if (!active) return;

        const next = pickAssignmentAlert(response.data);
        if (!next) return;

        const seenKey = `tms_assignment_alert_${next.id}`;
        if (sessionStorage.getItem(seenKey)) return;

        sessionStorage.setItem(seenKey, '1');
        setAlert(next);
      } catch {
        // ignore when offline
      }
    };

    load();

    const onNotification = () => load();
    window.addEventListener('tms:notification', onNotification);
    return () => {
      active = false;
      window.removeEventListener('tms:notification', onNotification);
    };
  }, []);

  const closeAlert = async (openTask = false) => {
    if (!alert || dismissing) return;
    setDismissing(true);

    try {
      await api.markNotificationRead(alert.id);
      window.dispatchEvent(new Event('tms:notification'));
    } catch {
      // still navigate if user asked to open the task
    }

    const path = openTask ? getTaskPath(alert) : null;
    setAlert(null);
    setDismissing(false);

    if (path) {
      navigate(path);
    }
  };

  if (!alert) return null;

  return (
    <div className="assignment-alert-backdrop" role="presentation">
      <div
        className="assignment-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="assignment-alert-title"
        aria-describedby="assignment-alert-message"
      >
        <div className="assignment-alert__icon" aria-hidden="true">
          <PinIcon size={28} />
        </div>
        <h2 id="assignment-alert-title">{alert.title || 'New task assigned'}</h2>
        <p id="assignment-alert-message">{alert.message}</p>
        <p className="muted assignment-alert__hint">
          You have a new assignment. Open the task to view details.
        </p>
        <div className="assignment-alert__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => closeAlert(false)}
            disabled={dismissing}
          >
            Dismiss
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => closeAlert(true)}
            disabled={dismissing}
          >
            Go to task
          </button>
        </div>
      </div>
    </div>
  );
}
