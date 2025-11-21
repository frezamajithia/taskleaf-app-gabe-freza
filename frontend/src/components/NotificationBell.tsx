import { useEffect, useRef, useState } from 'react';
import { NotificationItem } from '@/lib/notifications';

interface Props {
  notifications: NotificationItem[];
  buttonClassName?: string;
  iconClassName?: string;
}

export const NotificationBell = ({
  notifications,
  buttonClassName = '',
  iconClassName = '',
}: Props) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        open &&
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative notification-stack">
      <button
        ref={buttonRef}
        onClick={toggle}
        className={`transition-all duration-300 rounded-xl relative icon-button-flat ${buttonClassName}`}
        aria-label="Notifications"
      >
        <i className={`fa-solid fa-bell ${iconClassName}`}></i>
        {notifications.length > 0 && (
          <span className="notification-dot absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="notification-panel absolute right-0 mt-3 w-80 bg-white/95 dark:!bg-teal-900/95 rounded-2xl border border-patina-100 dark:border-teal-600 z-[1200] overflow-hidden shadow-2xl backdrop-blur-xl"
        >
          <div className="p-4 border-b border-patina-100 dark:border-teal-700 bg-gradient-to-r from-patina-50 to-white dark:!from-teal-800/90 dark:!to-teal-900/95 flex items-center justify-between">
            <h3 className="font-semibold text-patina-700 dark:!text-teal-100">Notifications</h3>
            <button
              onClick={close}
              className="text-patina-500 dark:!text-teal-300 hover:text-patina-700 dark:hover:!text-teal-200 text-xs font-medium transition-colors"
              aria-label="Close notifications"
            >
              Close
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fa-solid fa-bell-slash text-3xl text-patina-300 dark:!text-teal-600 mb-3"></i>
                <p className="text-sm text-patina-500 dark:!text-teal-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="notification-item p-4 border-b border-patina-50 dark:border-teal-700/50 cursor-pointer hover:bg-patina-25 dark:hover:!bg-teal-800/60 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                        notification.type === 'warning'
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : notification.type === 'success'
                          ? 'bg-green-500 dark:bg-green-400'
                          : 'bg-blue-500 dark:bg-blue-400'
                      }`}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm text-patina-700 dark:!text-teal-100 leading-relaxed">{notification.text}</p>
                      <p className="text-xs text-patina-500 dark:!text-teal-400 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
