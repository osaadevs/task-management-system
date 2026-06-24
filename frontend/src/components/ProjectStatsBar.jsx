import AnimatedNumber from './AnimatedNumber';
import StatCard from './StatCard';
import CompletionGauge from './CompletionGauge';
import { ClipboardIcon, ListTodoIcon, TargetIcon, CheckIcon } from './Icons';

export default function ProjectStatsBar({ stats, completionRate }) {
  return (
    <section className="project-stats" aria-label="Project task statistics">
      <div className="project-stats__total stat-card stat-card--featured">
        <div className="project-stats__total-inner">
          <div className="stat-card__icon stat-card__icon--featured" aria-hidden="true">
            <ClipboardIcon size={24} />
          </div>
          <div>
            <p className="stat-card__label project-stats__total-label">Total Tasks</p>
            <p className="project-stats__total-value">
              <AnimatedNumber value={stats.total} />
            </p>
            <p className="project-stats__total-hint muted">All work tracked in this project</p>
          </div>
        </div>
      </div>

      <div className="project-stats__breakdown">
        <StatCard
          label="To Do"
          value={stats.todo}
          accent="todo"
          icon={<ListTodoIcon size={20} />}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          accent="blue"
          icon={<TargetIcon size={20} />}
        />
        <StatCard
          label="Completed"
          value={stats.done}
          accent="green"
          icon={<CheckIcon size={20} />}
        />
        <CompletionGauge percent={completionRate} label="Progress" />
      </div>
    </section>
  );
}
