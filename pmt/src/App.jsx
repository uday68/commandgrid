import React from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import SideNavbar from './Components/SideNavbar.jsx'; // Corrected the import statement
import './App.css';
import { FiArrowLeft } from 'react-icons/fi';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import TeamMemberDashboard from './pages/TeamMemeberDashboard.jsx';
import TeamMemberProfile from './pages/TeamMemberProfile.jsx';
import TaskList from './pages/Task.jsx'

import Team from './pages/Team.jsx'
import Project from './pages/Projects.jsx'
import Home from './pages/Home'
import ViewTeam from './pages/viewTeam.jsx';
import Report from './pages/Reports.jsx'

function App() {
  

  return (
    <>
   
      <BrowserRouter>
    
        <SideNavbar />
        <Routes>

          <Route path="/" element={<Home/>}/>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/login' element={<Login />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/register' element={<Register/>}></Route>
          <Route path='/team-member-dashboard' element={<TeamMemberDashboard />} />
          <Route path='/team-member-profile' element={<TeamMemberProfile />} />
          <Route path='/tasks' element={<TaskList />} />
          <Route path="/reports" element={<Report/>}/>
          <Route path='/teams' element={<Team />} />
          <Route path='/projects' element={<Project />} />
          <Route path='/team/:id' element={<ViewTeam/>}/>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
