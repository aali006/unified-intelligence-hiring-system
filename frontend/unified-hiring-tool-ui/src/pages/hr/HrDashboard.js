// Enhanced HrDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './HrDashboard.css';
import { Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function HrDashboard() {
  const navigate = useNavigate();
  const [interviewsPending, setInterviewsPending] = useState(0);
  const [openPositions, setOpenPositions] = useState(0);
  const [closedWeekly, setClosedWeekly] = useState([0, 0, 0, 0]);
  const [interviewWeekly, setInterviewWeekly] = useState([0, 0, 0, 0]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candidatesRes, rolesRes, closedRolesRes, interviewersRes] = await Promise.all([
          axios.get('http://localhost:8080/get-candidates/'),
          axios.get('http://localhost:8080/get-roles/'),
          axios.get('http://localhost:8080/roles-closed/'),
          axios.get('http://localhost:8080/get-interviewers/')
        ]);

        const pending = candidatesRes.data.filter(candidate => {
          const rounds = candidate.interviews || [];
          const has1 = rounds.some(r => r.round === 1);
          const has2 = rounds.some(r => r.round === 2);
          return !(has1 && has2);
        });
        setInterviewsPending(pending.length);

        const open = rolesRes.data.filter(r => r.status === 'open');
        setOpenPositions(open.length);

        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const weeklyClosed = [0, 0, 0, 0];
        closedRolesRes.data.forEach(({ closed_on }) => {
          const d = new Date(closed_on);
          if (d >= start) {
            const w = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
            weeklyClosed[w]++;
          }
        });
        setClosedWeekly(weeklyClosed);

        const weeklyInterviews = [0, 0, 0, 0];
        interviewersRes.data.forEach(i => {
          (i.interviews_taken || []).forEach(({ datetime }) => {
            const d = new Date(datetime);
            if (d >= start) {
              const w = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
              weeklyInterviews[w]++;
            }
          });
        });
        setInterviewWeekly(weeklyInterviews);

      } catch (e) {
        console.error('❌ HR Dashboard fetch failed:', e);
      }
    };

    fetchData();
  }, []);

  const getWeeklyGrowth = (weekly) => {
    const today = new Date().getDate();
    const currentWeekIndex = Math.min(Math.floor((today - 1) / 7), 3);

    const last = weekly[currentWeekIndex] || 0;
    const prev = weekly[currentWeekIndex - 1] || 0;

    if (prev === 0 && last === 0) return 0;
    if (prev === 0 && last > 0) return 100;
    if (prev > 0 && last === 0) return -100;

    return Math.round(((last - prev) / prev) * 100);
  };

  const GrowthText = ({ value }) => {
    const isPositive = value >= 0;
    const isZero = value === 0;
    
    let icon, text, className;
    
    if (isZero) {
      icon = '➖';
      text = 'No change from last week';
      className = 'growth-text';
    } else if (isPositive) {
      icon = '🚀';
      text = `${value}% increase from last week`;
      className = 'growth-text growth-positive';
    } else {
      icon = '📉';
      text = `${Math.abs(value)}% decrease from last week`;
      className = 'growth-text growth-negative';
    }

    return (
      <div className={className}>
        <span>{icon}</span>
        <span>{text}</span>
      </div>
    );
  };

  const interviewGrowth = getWeeklyGrowth(interviewWeekly);
  const closedGrowth = getWeeklyGrowth(closedWeekly);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        ticks: { 
          stepSize: 1, 
          color: '#64748b',
          font: { size: 12 }
        }, 
        grid: { 
          color: 'rgba(148, 163, 184, 0.1)',
          borderDash: [5, 5]
        },
        border: { display: false }
      },
      x: { 
        ticks: { 
          color: '#64748b',
          font: { size: 12 }
        }, 
        grid: { display: false },
        border: { display: false }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  const closedChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Positions Closed',
      data: closedWeekly,
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      borderRadius: 8,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(30, 41, 59, 1)',
      hoverBorderRadius: 12,
    }]
  };

  const interviewChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Interviews Conducted',
      data: interviewWeekly,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderRadius: 8,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
      hoverBorderRadius: 12,
    }]
  };

  return (
    <div className="hr-dashboard container-fluid">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="dashboard-header">
          👋 Welcome Back, <span className="username">{user.name?.toUpperCase() || 'HR PROFESSIONAL'}</span>!
        </h2>
        <p className="subhead">Here's your hiring performance overview for this month</p>
      </motion.div>

      <div className="dashboard-grid">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="icon-circle bg-yellow">⏳</div>
          <h2>{interviewsPending}</h2>
          <p>Candidates Pending Review</p>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="icon-circle bg-blue">💼</div>
          <h2>{openPositions}</h2>
          <p>Active Job Openings</p>
        </motion.div>

        <motion.div
          className="chart-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h4>Positions Closed This Month</h4>
          <div style={{ height: '160px', width: '100%' }}>
            <Bar data={closedChartData} options={chartOptions} />
          </div>
          <GrowthText value={closedGrowth} />
          <button className="btn-view" onClick={() => navigate('/hr/roles')}>
            View All Roles →
          </button>
        </motion.div>

        <motion.div
          className="chart-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h4>Interviews Conducted</h4>
          <div style={{ height: '160px', width: '100%' }}>
            <Bar data={interviewChartData} options={chartOptions} />
          </div>
          <GrowthText value={interviewGrowth} />
          <button className="btn-view" onClick={() => navigate('/hr/candidates')}>
            View All Candidates →
          </button>
        </motion.div>
      </div>
    </div>
  );
}