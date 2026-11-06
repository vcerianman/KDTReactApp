import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from '@tanstack/react-query';
import NavBar from './NavBar';
import './Home.css';
import { getTaskPriorityClass, getPriorityTagClass } from './utils';

const queryClient = new QueryClient();

function TasksList() {
    const { isPending, error, data } = useQuery({
        queryKey: ['tasksList'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8080/api/tasks', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText || 'Network response was not ok'}`);
            }
            return res.json();
        },
    });

    if (isPending) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <p>Loading tasks...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '24px', color: '#e02424', textAlign: 'center' }}>
                <p>An error has occurred: {error.message}</p>
            </div>
        );
    }

    // Support direct array or enveloped response { data: [...] } / { tasks: [...] }
    const tasks = Array.isArray(data)
        ? data
        : (data?.data || data?.tasks || []);

    if (tasks.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#777' }}>
                <p>No tasks found.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '20px auto' }}>
            <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '16px' }}>
                Tasks List ({tasks.length})
            </h1>
            <div className="tasks-home-grid">
                {tasks.map((task, index) => {
                    const priority = task.priority || 'LOW';
                    const priorityClass = getTaskPriorityClass(priority);
                    const tagClass = getPriorityTagClass(priority);

                    return (
                        <div
                            key={task.id || task._id || index}
                            className={`task-home-card ${priorityClass}`}
                        >
                            <div>
                                <div className="task-card-header">
                                    <div className="task-home-title">
                                        {task.title || task.name || 'Untitled Task'}
                                        <span className={`task-priority-tag ${tagClass}`}>
                                            {priority}
                                        </span>
                                    </div>
                                    {(task.assigner || task.assignedTo || task.assigned_to) && (
                                        <div className="task-assigner">
                                            Assigner: <span className="task-assigner-name">{task.assigner || task.assignedTo || task.assigned_to}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="task-home-desc">
                                    {task.description || task.desc || 'No description provided.'}
                                </div>
                            </div>
                            <div className="task-home-footer">
                                <span className="status-text">
                                    Status: {task.status || 'TODO'}
                                </span>
                                {(task.dates || task.dueDate || task.due_date) && (
                                    <span className="task-dates">
                                        {task.dates || task.dueDate || task.due_date}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Example() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="example-page-wrapper">
                <div id="navbar-root">
                    <NavBar />
                </div>
                <div className="page-container" style={{ padding: '20px' }}>
                    <TasksList />
                </div>
            </div>
        </QueryClientProvider>
    );
}

export default Example;
