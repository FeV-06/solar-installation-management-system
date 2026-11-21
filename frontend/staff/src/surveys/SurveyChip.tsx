import { CircleCheck, CircleDashed, ClipboardCheck, Clock, type LucideIcon } from 'lucide-react';
import type { SurveyStatus } from '../api/surveys';
import { Icon } from '../components/Icon';

const STATUS: Record<SurveyStatus, { tone: string; icon: LucideIcon; label: string }> = {
  Scheduled: { tone: 'info', icon: Clock, label: 'Scheduled' },
  Submitted: { tone: 'warning', icon: ClipboardCheck, label: 'Needs review' },
  Approved: { tone: 'positive', icon: CircleCheck, label: 'Approved' },
  Rejected: { tone: 'closed', icon: CircleDashed, label: 'Rejected' },
};

export function SurveyChip({ status }: { status: SurveyStatus }) {
  const { tone, icon, label } = STATUS[status];
  return <span className={`chip tone-${tone}`}><Icon icon={icon} />{label}</span>;
}
