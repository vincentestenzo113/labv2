import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../Pages/supabaseClient';
import logo from './images/logo.png';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservationHistory, setReservationHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  // Form states for laboratory management
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  
  // Form states for user management
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [calendar, setCalendar] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [userProfile, setUserProfile] = useState({ name: '', profilePicture: '' });

  const [myReservations, setMyReservations] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [usersPerPage] = useState(3); // Set the number of users per page
  const [currentReservationPage, setCurrentReservationPage] = useState(1);
  const [reservationsPerPage] = useState(3); // Set the number of reservations per page

  const [currentLogPage, setCurrentLogPage] = useState(1);
  const [logsPerPage] = useState(3); // Set the number of logs per page

  const [hoveredDay, setHoveredDay] = useState(null); // State to track hovered day

  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  const searchInputRef = useRef(null); // Create a ref for the search input

  const [currentRoom1User, setCurrentRoom1User] = useState(null);
  const [currentRoom2User, setCurrentRoom2User] = useState(null);

  useEffect(() => {
    fetchUserData();
    generateCalendar();
    fetchCurrentRoomUsers();
    const interval = setInterval(fetchCurrentRoomUsers, 60000); // Poll every minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, [currentMonth]);

  const fetchUserData = async () => {
    await Promise.all([fetchAllReservations(), fetchAvailableSlots(), fetchUserProfile()]);
  };

  const fetchAllReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, users(student_id)")
        .order("date", { ascending: true });

      if (error) throw error;
      setMyReservations(data || []);
      generateCalendar();
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const { data, error } = await supabase
        .from("lab_availability")
        .select("*")
        .eq("is_available", true);

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleReservation = async (date, startTime) => {
    try {
      const userId = localStorage.getItem("userId");

      // Calculate end time (1 hour after start time)
      const [hours, minutes] = startTime.split(":");
      const startDate = new Date();
      startDate.setHours(parseInt(hours), parseInt(minutes), 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      const endTime = `${endDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

      const { error } = await supabase.from("reservations").insert([
        {
          user_id: userId,
          date,
          start_time: startTime,
          end_time: endTime,
          room: "Laboratory", // Default room name
          status: "pending",
        },
      ]);

      if (error) throw error;

      fetchUserData();
      alert("Reservation created successfully!");
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchAllData();
  }, [navigate]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchSchedules(),
      fetchUsers(),
      fetchReservationHistory(),
      fetchLogs(),
    ]);
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      setSchedules(data);
    } catch (error) {
      setError('Error fetching schedules: ' + error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      setError('Error fetching users: ' + error.message);
    }
  };

  const fetchReservationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, users(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReservationHistory(data);
    } catch (error) {
      setError('Error fetching reservation history: ' + error.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
        throw error;
      }

      console.log('Fetched logs:', data);
      setLogs(data);
    } catch (error) {
      setError('Error fetching logs: ' + error.message);
    }
  };

  // Laboratory Management Functions
  const handleLabAvailability = async (e) => {
    e.preventDefault();
    try {
      // Calculate end time (1 hour after start time)
      const [hours, minutes] = startTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(hours), parseInt(minutes), 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('lab_availability')
        .upsert([
          {
            date,
            start_time: startTime,
            end_time: endTime,
            room: 'Laboratory' // Default room name
          }
        ]);
      if (error) throw error;
      fetchSchedules();
      resetForm();
    } catch (error) {
      setError('Error updating lab availability: ' + error.message);
    }
  };

  // User Management Functions
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('student_id', username)
        .single();

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create auth account with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Insert new user with username in student_id
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            student_id: username,
            email: email,
            is_active: true,
            role: 'user'
          }
        ]);

      if (insertError) throw insertError;

      // Reset form and refresh user list
      setUsername('');
      setEmail('');
      setPassword('');
      fetchUsers();
      alert('User added successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateAccount = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ username, password })
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
      resetForm();
    } catch (error) {
      setError('Error updating account: ' + error.message);
    }
  };

  const handleDeactivateAccount = async (userId, isActive) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this account?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ is_active: !isActive })
          .eq('id', userId);
        if (error) throw error;
        fetchUsers();
      } catch (error) {
        setError(`Error ${action}ing account: ` + error.message);
      }
    }
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      try {
        const { error } = await supabase
          .from('logs')
          .delete()
          .eq('id', logId);
        if (error) throw error;
        fetchLogs();
      } catch (error) {
        setError('Error deleting log: ' + error.message);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Do you want to Log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      navigate('/login');
    }
  };

  const resetForm = () => {
    setDate('');
    setStartTime('');
    setEndTime('');
    setRoom('');
    setUsername('');
    setEmail('');
    setPassword('');
    setSelectedUser(null);
  };

  const handleDeleteReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to delete this reservation?')) {
      try {
        // Delete the reservation
        const { error } = await supabase
          .from('reservations')
          .delete()
          .eq('id', reservationId);

        if (error) throw error;

        // Refresh both lists
        await Promise.all([
          fetchReservationHistory(),
          fetchSchedules()
        ]);

        alert('Reservation deleted successfully!');
      } catch (error) {
        setError('Error deleting reservation: ' + error.message);
      }
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', reservationId);

        if (error) throw error;

        // Refresh both lists
        await Promise.all([
          fetchReservationHistory(),
          fetchSchedules()
        ]);

        alert('Reservation cancelled successfully!');
      } catch (error) {
        setError('Error cancelling reservation: ' + error.message);
      }
    }
  };

  const handleAcceptReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to accept this reservation?')) {
      try {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'accepted' })
          .eq('id', reservationId);

        if (error) throw error;

        // Refresh both lists
        await Promise.all([
          fetchReservationHistory(),
          fetchSchedules()
        ]);

        alert('Reservation accepted successfully!');
      } catch (error) {
        setError('Error accepting reservation: ' + error.message);
      }
    }
  };

  const handleDeclineReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to decline this reservation?')) {
      try {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'declined' })
          .eq('id', reservationId);

        if (error) throw error;

        // Refresh both lists
        await Promise.all([
          fetchReservationHistory(),
          fetchSchedules()
        ]);

        alert('Reservation declined successfully!');
      } catch (error) {
        setError('Error declining reservation: ' + error.message);
      }
    }
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 0).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];

    // Adjust the start of the week to Monday
    const adjustedFirstDay = (firstDayOfMonth + 6) % 7;

    // Fill in the days before the first day of the month
    for (let i = 0; i < adjustedFirstDay; i++) {
      calendarDays.push({ date: null, status: 'empty' });
    }

    // Fill in the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const formattedDate = date.toISOString().split('T')[0];

      const reservationsForDay = myReservations.filter(
        (reservation) => reservation.date === formattedDate
      );

      const morningReservation = reservationsForDay.find(
        (reservation) => reservation.status === 'morning'
      );
      const afternoonReservation = reservationsForDay.find(
        (reservation) => reservation.status === 'afternoon'
      );

      // Determine the status of the day based on reservations
      let status;
      if (morningReservation && afternoonReservation) {
        status = 'reserved'; // Both morning and afternoon reserved
      } else if (morningReservation) {
        status = 'morning'; // Only morning reserved
      } else if (afternoonReservation) {
        status = 'afternoon'; // Only afternoon reserved
      } else {
        status = 'available'; // No reservations
      }

      calendarDays.push({
        date: formattedDate,
        status: status,
        reservations: reservationsForDay, // Store reservations for the day
      });
    }

    // Ensure the last day of the month is included
    if (calendarDays.length % 7 !== 0) {
      const remainingDays = 7 - (calendarDays.length % 7);
      for (let i = 0; i < remainingDays; i++) {
        calendarDays.push({ date: null, status: 'empty' });
      }
    }

    setCalendar(calendarDays);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'red';
      case 'pending':
        return 'yellow';
      case 'available':
        return 'white';
      default:
        return 'white';
    }
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  // Calculate the current users to display
  const indexOfLastUser = currentUserPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  // Filter reservations based on search term
  const filteredReservations = reservationHistory.filter((reservation) =>
    reservation.users?.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastReservation = currentReservationPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  const currentReservations = filteredReservations.slice(indexOfFirstReservation, indexOfLastReservation); // Get current reservations

  const handleSearch = () => {
    setCurrentReservationPage(1); // Reset to the first page
    if (searchInputRef.current) {
      searchInputRef.current.focus(); // Focus the search input
    }
  };

  // Filter logs based on any criteria if needed
  const filteredLogs = logs; // Assuming logs is already fetched and available

  const indexOfLastLog = currentLogPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog); // Get current logs

  const fetchCurrentRoomUsers = async () => {
    try {
      const now = new Date();
      const nowTime = now.toTimeString().split(' ')[0]; // Extracts 'HH:MM:SS' from the current time

      const { data: room1Data, error: room1Error } = await supabase
        .from('reservations')
        .select('users(student_id), start_time, end_time, room')
        .eq('room', 1)
        .lte('start_time', nowTime)
        .gte('end_time', nowTime)
        .single();

      if (room1Error) {
        console.error('Error fetching room 1 data:', room1Error);
        throw room1Error;
      }
      
      console.log('Room 1 data:', room1Data); // Log the fetched data
      setCurrentRoom1User(room1Data);

      const { data: room2Data, error: room2Error } = await supabase
        .from('reservations')
        .select('users(student_id), start_time, end_time, room')
        .eq('room', 2)
        .lte('start_time', nowTime)
        .gte('end_time', nowTime)
        .single();

      if (room2Error) throw room2Error;
      setCurrentRoom2User(room2Data);
    } catch (error) {
      setError('Error fetching current room users: ' + error.message);
    }
  };

  return (
    <div className='main'>

    <div className='logo'> 
        <img src={logo} alt="Logo" />
      </div>

      {/* Navigation */}
      <div className='nav'>
      <div>
        <h1>Admin Dashboard</h1>
      </div>
      <div className='home-container'>
        <button
          style={{ backgroundColor: activeView === 'dashboard' ? '#ffdf7e' : '' }}
          onClick={() => setActiveView('dashboard')}
        >
          Dashboard
        </button>
        <button
          style={{ backgroundColor: activeView === 'reservationHistory' ? '#ffdf7e' : '' }}
          onClick={() => setActiveView('reservationHistory')}
        >
          Reservation History
        </button>
        <button
          style={{ backgroundColor: activeView === 'labManagement' ? '#ffdf7e' : '' }}
          onClick={() => setActiveView('labManagement')}
        >
          Manage Laboratory
        </button>
        <button
          style={{ backgroundColor: activeView === 'userManagement' ? '#ffdf7e' : '' }}
          onClick={() => setActiveView('userManagement')}
        >
          Manage Users
        </button>
        <button
          style={{ backgroundColor: activeView === 'logs' ? '#ffdf7e' : '' }}
          onClick={() => setActiveView('logs')}
        >
          View Logs
        </button>
        <button
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
          <div className="dashboard-container">
             {/* Calendar View */}
        <h2>Calendar</h2>
        <span>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {calendar.map((day, index) => {
            let backgroundColor;
            switch (day.status) {
              case 'reserved':
                backgroundColor = 'red'; // Both morning and afternoon reserved
                break;
              case 'morning':
                backgroundColor = 'orange'; // Only morning reserved
                break;
              case 'afternoon':
                backgroundColor = 'yellow'; // Only afternoon reserved
                break;
              default:
                backgroundColor = 'white'; // Available
            }

            return (
              <div
                key={index}
                style={{
                  backgroundColor: backgroundColor,
                  padding: '10px',
                  border: '1px solid #ccc',
                  textAlign: 'center',
                  position: 'relative', // Position relative for tooltip
                }}
                onMouseEnter={() => setHoveredDay(day)} // Set hovered day on mouse enter
                onMouseLeave={() => setHoveredDay(null)} // Clear hovered day on mouse leave
              >
                {day.date ? new Date(day.date).getDate() : ''}
                {hoveredDay === day && (day.reservations && day.reservations.length > 0) && ( // Show tooltip if hovered day has reservations
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '5px',
                    borderRadius: '5px',
                    zIndex: 1,
                    display: 'flex', // Use flexbox for horizontal layout
                    flexDirection: 'row', // Arrange items in a row
                    whiteSpace: 'nowrap', // Prevent wrapping
                  }}>
                    {day.reservations.map((reservation, idx) => (
                      <div key={idx} style={{ marginRight: '10px' }}> {/* Add margin for spacing */}
                        <p style={{ margin: 0 }}>Username: {reservation.users.student_id}</p>
                        <p style={{ margin: 0 }}>Time: {reservation.start_time} - {reservation.end_time}</p>
                        <p style={{ margin: 0 }}>Room: {reservation.room}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="bottom-container">
        <div className="month-button">
          <div>
          <button onClick={handlePreviousMonth}>Previous</button>
          <button onClick={handleNextMonth}>Next</button>
          </div>
        </div>
        <div>
            <p>Rooms</p>
            <p>Room 1 = Computer lab 1 - WAC 212</p>
            <p>Room 2 = Computer lab 2 - WAC 213</p>
            <p>Room 3 = Computer lab 3 - NAC 303</p>
          </div>
        <div>
          <p>Color code:</p>
          <p style={{ color: 'red' }}>Red - Whole day Reserved</p>
          <p style={{ color: 'yellow' }}>Yellow - Afternoon Reserved</p>
          <p style={{ color: 'orange' }}>Orange - Morning Reserved</p>
          <p style={{ color: 'white' }}>White - Available</p>
        </div>
        </div>
      </div>
      )}

      {/* Reservation History */}
      {activeView === 'reservationHistory' && (
        <div className='main-container'>
          <h2>Reservation History</h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Search by Username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // Update search term on input change
              style={{ padding: '5px', width: '200px' }} // Set a specific width for the search bar
              ref={searchInputRef} // Attach the ref to the input
            />
          </div>
          <div className='box-container'>
            {currentReservations.length > 0 ? (
              currentReservations.map((reservation) => (
                <div key={reservation.id}>
                  <div>
                    <div>
                      <p>Username: {reservation.users?.student_id}</p>
                      <p>Room: {reservation.room}</p>
                      <p>Date: {reservation.date}</p>
                      <p>Time: {reservation.start_time} - {reservation.end_time}</p>
                      <p>
                        Status: {reservation.status}
                      </p>
                    </div>
                    <div className='admin-button'>
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAcceptReservation(reservation.id)}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineReservation(reservation.id)}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteReservation(reservation.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>No reservations found.</p> // Message when no reservations match the search
            )}
            
          </div>

          <div className='button'>
            <button onClick={() => setCurrentReservationPage(currentReservationPage - 1)} disabled={currentReservationPage === 1}>Previous</button>
            <button onClick={() => setCurrentReservationPage(currentReservationPage + 1)} disabled={indexOfLastReservation >= filteredReservations.length}>Next</button>
          </div>
          
          {/* Pagination Controls */}
        </div>
      )}

      {/* Laboratory Management */}
      {activeView === 'labManagement' && (
        <div className='main-container'>
          <h2>Manage Laboratory Availability</h2>
          <div className='manage-lab'>
            <h3>Current Room Usage</h3>
            <div>
              <p>Room 1: {currentRoom1User ? `${currentRoom1User.users.student_id} from ${currentRoom1User.start_time} to ${currentRoom1User.end_time}` : 'No current user'}</p>
              <p>Room 2: {currentRoom2User ? `${currentRoom2User.users.student_id} from ${currentRoom2User.start_time} to ${currentRoom2User.end_time}` : 'No current user'}</p>
            </div>
          </div>

        </div>
      )}

      {/* User Management */}
      {activeView === 'userManagement' && (
        <div className='main-container'>
          <h2>Manage Users</h2>
          
          {/* Add User Form */}
          
            <h3>Add New User</h3>
            <form onSubmit={handleAddUser} className='form'>
            <div className='make-container'>
              <div>
                <label>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">
                Add User
              </button>
              </div>
            </form>
        
          {/* User List */}
          <div>
            <h3>User List</h3>
            <div className='box-container'>
              {currentUsers.map((user) => (
                <div key={user.id}>
                  <div>
                    <p>Username: {user.student_id}</p>
                    <p>
                      Status: {user.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className='admin-button'>
                    <button
                      onClick={() => handleDeactivateAccount(user.id, user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            <div class="history-button">
              <button onClick={() => setCurrentUserPage(currentUserPage - 1)} disabled={currentUserPage === 1}>Previous</button>
              <button onClick={() => setCurrentUserPage(currentUserPage + 1)} disabled={indexOfLastUser >= users.length}>Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className='main-container'>
          <h2>System Logs</h2>
          <div className='box-container'>
            {currentLogs.length > 0 ? (
              currentLogs.map((log) => (
                <div key={log.id}>
                  <p>Description: {log.description || 'No description available'}</p>
                  <p>Timestamp: {new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p>No logs available.</p>
            )}
          </div>
          {/* Pagination Controls for Logs */}
          <div>
            <button onClick={() => setCurrentLogPage(currentLogPage - 1)} disabled={currentLogPage === 1}>Previous</button>
            <button onClick={() => setCurrentLogPage(currentLogPage + 1)} disabled={indexOfLastLog >= filteredLogs.length}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;