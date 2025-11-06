import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FiPlus, FiMoreVertical, FiUser, FiTag, FiCalendar, FiLoader } from "react-icons/fi";
import axios from "axios";
import { useTranslation } from 'react-i18next';

axios.defaults.baseURL = 'http://localhost:5000';

const TaskBoard = ({ projectId, theme }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingTask, setAddingTask] = useState(false);

  const columns = [
    { id: "todo", title: t("taskBoard.todo") },
    { id: "in-progress", title: t("taskBoard.inProgress") },
    { id: "done", title: t("taskBoard.done") },
  ];
  const headers  = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          axios.get(`/api/projects/${projectId}/tasks`, {
            headers: headers
          }),
          axios.get(`/api/projects/${projectId}/users`, {
            headers: headers
          })
        ]);
        setTasks(tasksRes.data.tasks);
        setUsers(usersRes.data.users);
      } catch (err) {
        setError(t("taskBoard.fetchError"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId, t]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const updatedTasks = [...tasks];
    const task = updatedTasks.find(t => t.task_id === result.draggableId);
    const newStatus = result.destination.droppableId;

    try {
      // Optimistic UI update
      task.status = newStatus;
      await axios.put(`http://localhost:5000/api/tasks/${task.task_id}`, {

        status: newStatus
      });
    } catch (err) {
      // Rollback on error
      setTasks(tasks);
      setError(t("taskBoard.updateStatusError"));
    }
  };

  const handleAssigneeChange = async (taskId, userId) => {
    try {
      const updatedTasks = tasks.map(task => 
        task.task_id === taskId ? { ...task, assigned_to: userId } : task
      );
      setTasks(updatedTasks);

      await axios.put(`/api/tasks/${taskId}`, {
        assigned_to: userId
      });
    } catch (err) {
      setTasks(tasks);
      setError(t("taskBoard.updateAssigneeError"));
    }
  };

  const handleAddTask = async (columnId) => {
    try {
      setAddingTask(true);
      const newTask = {
        title: t("taskBoard.newTask"),
        description: "",
        status: columnId,
        project_id: projectId
      }
      const res = await axios.post("http://localhost:5000/api/tasks", newTask);

      setTasks([...tasks, res.data.task]);
    } catch (err) {
      setError(t("taskBoard.createTaskError"));
    } finally {
      setAddingTask(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <FiLoader className="animate-spin text-2xl" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-500">{error}</div>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`p-4 rounded-lg ${theme.border} border`}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`min-w-[300px] p-4 rounded-lg ${theme.card}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">{column.title}</h3>
                    <button 
                      onClick={() => handleAddTask(column.id)}
                      disabled={addingTask}
                      className={`p-2 rounded-lg hover:${theme.bg} disabled:opacity-50`}
                    >
                      {addingTask ? <FiLoader className="animate-spin" /> : <FiPlus />}
                    </button>
                  </div>
                  
                  {tasks
                    .filter((task) => task.status === column.id)
                    .map((task, index) => (
                      <Draggable
                        key={task.task_id}
                        draggableId={task.task_id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 mb-2 rounded-lg ${theme.border} border`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium">{task.title}</span>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <FiMoreVertical />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <FiTag className="opacity-60" />
                              <span className="opacity-70">
                                {task.due_date && `${t("taskBoard.due")}: ${new Date(task.due_date).toLocaleDateString()}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <FiUser className="opacity-60" />
                              <select
                                className={`text-sm ${theme.bg} rounded px-2 py-1`}
                                value={task.assigned_to || ""}
                                onChange={(e) => handleAssigneeChange(task.task_id, e.target.value)}
                              >
                                <option value="">{t("taskBoard.unassigned")}</option>
                                {users.map(user => (
                                  <option key={user.user_id} value={user.user_id}>
                                    {user.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default TaskBoard;