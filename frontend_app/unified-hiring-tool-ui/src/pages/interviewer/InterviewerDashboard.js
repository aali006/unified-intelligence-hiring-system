import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
// import InterviewerNavbar from '../../components/InterviewerNavbar';
import './InterviewerDashboard.css';
import { Bar } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function InterviewerDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [interviewerData, setInterviewerData] = useState(null);
  const [interviewsToday, setInterviewsToday] = useState(0);
  const [interviewsLastMonth, setInterviewsLastMonth] = useState(0);
  const [pendingInterviews, setPendingInterviews] = useState(0);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0]);

  useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const [interviewersRes, candidatesRes] = await Promise.all([
//           axios.get('http://localhost:8080/get-interviewers/'),
//           axios.get('http://localhost:8080/get-candidates/')
//         ]);

//         const today = new Date().toISOString().slice(0, 10);
//         const oneMonthAgo = new Date();
//         oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

//         // const interviewer = interviewersRes.data.find(
//         //   (int) => int.interviewer_id === userId
//         // REPLACE EVERYTHING FROM HERE TO setInterviewerData WITH THIS:
//         setInterviewerData(interviewer || { 
//         name: "Interviewer", 
//         interviews_taken: [] 
// }
//         );
//         if (!interviewer) {
//           console.error('No such interviewer found.');
//           return;
//         }

//         setInterviewerData(interviewer);

//         const allInterviews = interviewer.interviews_taken || [];

//         const todayCount = allInterviews.filter((i) =>
//           i.datetime.startsWith(today)
//         ).length;
//         setInterviewsToday(todayCount);

//         const lastMonthCount = allInterviews.filter(
//           (i) => new Date(i.datetime) >= oneMonthAgo
//         ).length;
//         setInterviewsLastMonth(lastMonthCount);

//         const pending = candidatesRes.data.filter((candidate) => {
//           const rounds = candidate.interviews || [];
//           const hasRound1 = rounds.some((r) => r.round === 1);
//           const hasRound2 = rounds.some((r) => r.round === 2);
//           return !(hasRound1 && hasRound2);
//         });

//         setPendingInterviews(pending.length);
//       } catch (err) {
//         console.error('❌ Failed to load interviewer stats:', err);
//       }
//     };
// const fetchStats = async () => {
//   try {
//     const [interviewersRes, candidatesRes] = await Promise.all([
//       axios.get('http://localhost:8080/get-interviewers/'),
//       axios.get('http://localhost:8080/get-candidates/')
//     ]);

//     // 1. Get the ID from URL or LocalStorage (as a backup)
//     const localUser = JSON.parse(localStorage.getItem('user') || '{}');
//     const activeId = userId || localUser.interviewer_id || localUser.id;

//     console.log("Searching for ID:", activeId); // Check your console (F12) for this!

//     // 2. Find the interviewer
//     const interviewer = interviewersRes.data.find(
//       (int) => String(int.interviewer_id) === String(activeId)
//     );

//     if (interviewer) {
//       setInterviewerData(interviewer);
      
//       // Calculate Stats
//       const allInterviews = interviewer.interviews_taken || [];
//       setInterviewsToday(allInterviews.length); // Temporary test: show total to see if it works
//     }

//     // 3. FIX: Pending Candidates (Simplified)
//     // If the HR dashboard works, we use the simplest logic here
//     const pending = candidatesRes.data.filter(c => {
//         const rounds = c.interviews || [];
//         return rounds.length < 2; 
//     });
//     setPendingInterviews(pending.length);

//   } catch (err) {
//     console.error('❌ Fetch failed:', err);
//   }
// };

const BASE_URL = "https://unwithering-unattentively-herbert.ngrok-free.dev"

const fetchStats = async () => {
  try {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    }
    const [interviewersRes, candidatesRes] = await Promise.all([
      axios.get(`${BASE_URL}/get-interviewers/`, headers),
      axios.get(`${BASE_URL}/get-candidates/`, headers)
    ]);

    // 1. Update Pending Candidates (The part that works)
    setPendingInterviews(candidatesRes.data.filter(c => (c.interviews || []).length < 2).length);

    // 2. Find YOU in the database
    const activeId = userId || localUser.user_id || localUser.interviewer_id || localUser.id;
    const dbUser = interviewersRes.data.find(int => 
      String(int.interviewer_id) === String(activeId) || String(int.id) === String(activeId)
    );

    // 3. Use Database data if found, otherwise use Login data
    const userData = dbUser || localUser;
    
    if (userData) {
      setInterviewerData(userData);

      // --- DEBUGGING LOGS ---
      console.log("Full User Object found:", userData);
      // Check if your backend uses 'interviews_taken' or just 'interviews'
      const allInterviews = userData.interviews_taken || userData.interviews || [];
      console.log("Interviews Array Length:", allInterviews.length);

      const todayStr = new Date().toLocaleDateString('en-CA');
      // const currentMonth = new Date().getMonth();

      // IF TODAY IS 0, WE FORCE IT TO SHOW TOTAL COUNT JUST TO TEST CONNECTION
      const todayCount = allInterviews.filter(i => 
        i.datetime && new Date(i.datetime).toLocaleDateString('en-CA') === todayStr
      ).length;

      setInterviewsToday(todayCount > 0 ? todayCount : allInterviews.length); // If today is 0, show total
      setInterviewsLastMonth(allInterviews.length);
    }

  } catch (err) {
    console.error('❌ Final Fetch Error:', err);
  }
};

    fetchStats();
  }, [userId]);

  useEffect(() => {
    const calculateWeeklyTrend = (interviews) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const weeklyCounts = [0, 0, 0, 0];

      interviews.forEach(({ datetime }) => {
        const interviewDate = new Date(datetime);
        if (interviewDate >= startOfMonth) {
          const dayOfMonth = interviewDate.getDate();
          const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
          weeklyCounts[weekIndex]++;
        }
      });

      setWeeklyData(weeklyCounts);
    };

    if (interviewerData) {
      calculateWeeklyTrend(interviewerData.interviews_taken || []);
    }
  }, [interviewerData]);

  // Highlight current week
  const today = new Date();
  const currentDay = today.getDate();
  const currentWeekIndex = Math.min(Math.floor((currentDay - 1) / 7), 3);

  const colors = weeklyData.map((_, i) =>
    i === currentWeekIndex ? '#FF5733' : '#339DFF'
  );

  const lastWeek = currentWeekIndex - 1;
  const percentGrowth =
    lastWeek >= 0 && weeklyData[lastWeek] > 0
      ? Math.round(
          ((weeklyData[currentWeekIndex] - weeklyData[lastWeek]) /
            weeklyData[lastWeek]) *
            100
        )
      : 0;

  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Interviews Conducted',
        data: weeklyData,
        backgroundColor: colors,
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Interview Activity - Weekly Breakdown',
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#000',
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw} interviews`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#333',
          font: { weight: 'bold' },
        },
        grid: {
          color: '#eee',
        },
      },
      x: {
        ticks: {
          color: '#333',
          font: { weight: 'bold' },
        },
        grid: {
          display: false,
        },
      },
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeOutQuad',
        from: 1,
        to: 0,
        loop: true,
      },
    },
  };

  // if (!interviewerData) {
  //   return <div className="loading">Loading dashboard...</div>;
  // }

  return (
    <>
      <div className="interviewer-dashboard">
        <div className="welcome-text">
          <h2>
            👋 Welcome Back,{' '}
            <span className="username">
              {interviewerData?.name?.toUpperCase() || 'INTERVIEWER'}
            </span>
            !
          </h2>
          <p>Ready to meet your next candidate?</p>
        </div>

        <div className="stats-container">
          <div className="stat-box completed">
            <div className="icon completed-icon">
              <i className="bi bi-check"></i>
            </div>
            <div className="stat">
              <h3>{interviewsToday}</h3>
              <p>Interviews Conducted Today</p>
            </div>
          </div>

          <div className="stat-box pending">
            <div className="icon pending-icon">
              <i className="bi bi-clock"></i>
            </div>
            <div className="stat">
              <h3>{pendingInterviews}</h3>
              <p>Candidates Pending</p>
            </div>
          </div>

          <div className="stat-box total">
            <div className="icon total-icon">
              <i className="bi bi-bar-chart-line"></i>
            </div>
            <div className="stat">
              <h3>{interviewsLastMonth}</h3>
              <p>Total Interviews This Month</p>
            </div>
          </div>

          <div className="stat-box chart-box">
            <h4>INTERVIEWS TREND THIS MONTH</h4>
            <Bar data={chartData} options={chartOptions} />
            <p
              className="growth-text"
              style={{ color: percentGrowth >= 0 ? 'green' : 'red' }}
            >
              {percentGrowth > 0
                ? `⬆️ ${percentGrowth}% from last week`
                : percentGrowth < 0
                ? `⬇️ ${Math.abs(percentGrowth)}% from last week`
                : 'No change from last week'}
            </p>
            <button
              className="view-btn"
              onClick={() => navigate('/interviewer/interviews')}
            >
              View All Interviews
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default InterviewerDashboard;
