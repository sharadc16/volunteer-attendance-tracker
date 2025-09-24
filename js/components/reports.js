/**
 * Reports Component - Handles reporting and analytics
 */
window.Reports = {
  
  // Initialize reports component
  init() {
    console.log('Reports component initialized');
  },
  
  // Generate attendance report
  async generateAttendanceReport(period = 'week', options = {}) {
    try {
      const stats = await Storage.getAttendanceStats(period);
      const attendance = await this.getAttendanceByPeriod(period);
      
      const report = {
        period,
        generatedAt: new Date().toISOString(),
        summary: {
          totalCheckIns: stats.totalRecords,
          uniqueVolunteers: stats.uniqueVolunteers,
          averageAttendance: this.calculateAverageAttendance(attendance, period)
        },
        byCommittee: this.analyzeByCommittee(stats.byCommittee),
        byDate: this.analyzeByDate(attendance),
        topVolunteers: await this.getTopVolunteers(attendance),
        trends: this.analyzeTrends(attendance)
      };
      
      return report;
      
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  },
  
  // Get attendance data by period
  async getAttendanceByPeriod(period) {
    const allAttendance = await Storage.getAllAttendance();
    const now = new Date();
    
    let startDate;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(0); // All time
    }
    
    return allAttendance.filter(record => 
      new Date(record.dateTime) >= startDate
    );
  },
  
  // Calculate average attendance
  calculateAverageAttendance(attendance, period) {
    if (attendance.length === 0) return 0;
    
    const attendanceByDate = Utils.Array.groupBy(attendance, 'date');
    const dates = Object.keys(attendanceByDate);
    
    if (dates.length === 0) return 0;
    
    const totalAttendance = dates.reduce((sum, date) => 
      sum + attendanceByDate[date].length, 0
    );
    
    return Math.round(totalAttendance / dates.length);
  },
  
  // Analyze attendance by committee
  analyzeByCommittee(byCommittee) {
    const committees = Object.entries(byCommittee).map(([committee, records]) => ({
      name: committee || 'Unknown',
      count: records.length,
      percentage: 0 // Will be calculated below
    }));
    
    const total = committees.reduce((sum, committee) => sum + committee.count, 0);
    
    committees.forEach(committee => {
      committee.percentage = total > 0 ? Math.round((committee.count / total) * 100) : 0;
    });
    
    return committees.sort((a, b) => b.count - a.count);
  },
  
  // Analyze attendance by date
  analyzeByDate(attendance) {
    const byDate = Utils.Array.groupBy(attendance, 'date');
    
    return Object.entries(byDate)
      .map(([date, records]) => ({
        date,
        count: records.length,
        uniqueVolunteers: Utils.Array.unique(records, 'volunteerId').length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },
  
  // Get top volunteers by attendance
  async getTopVolunteers(attendance, limit = 10) {
    const byVolunteer = Utils.Array.groupBy(attendance, 'volunteerId');
    
    const volunteerStats = await Promise.all(
      Object.entries(byVolunteer).map(async ([volunteerId, records]) => {
        const volunteer = await Storage.getVolunteer(volunteerId);
        return {
          id: volunteerId,
          name: volunteer ? volunteer.name : 'Unknown',
          committee: volunteer ? volunteer.committee : 'Unknown',
          attendanceCount: records.length,
          lastAttendance: records.reduce((latest, record) => 
            new Date(record.dateTime) > new Date(latest.dateTime) ? record : latest
          ).dateTime
        };
      })
    );
    
    return volunteerStats
      .sort((a, b) => b.attendanceCount - a.attendanceCount)
      .slice(0, limit);
  },
  
  // Analyze attendance trends
  analyzeTrends(attendance) {
    if (attendance.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    const byDate = this.analyzeByDate(attendance);
    
    if (byDate.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    // Calculate trend over last few data points
    const recentData = byDate.slice(-5); // Last 5 data points
    const firstCount = recentData[0].count;
    const lastCount = recentData[recentData.length - 1].count;
    
    const change = lastCount - firstCount;
    const percentChange = firstCount > 0 ? Math.round((change / firstCount) * 100) : 0;
    
    let trend = 'stable';
    if (percentChange > 10) trend = 'increasing';
    else if (percentChange < -10) trend = 'decreasing';
    
    return { trend, change: percentChange };
  },
  
  // Export report to CSV
  async exportToCSV(reportData, filename) {
    try {
      let csvContent = '';
      
      // Report header
      csvContent += `Attendance Report - ${reportData.period}\n`;
      csvContent += `Generated: ${Utils.Date.format(reportData.generatedAt, 'datetime')}\n\n`;
      
      // Summary
      csvContent += 'SUMMARY\n';
      csvContent += `Total Check-ins,${reportData.summary.totalCheckIns}\n`;
      csvContent += `Unique Volunteers,${reportData.summary.uniqueVolunteers}\n`;
      csvContent += `Average Attendance,${reportData.summary.averageAttendance}\n\n`;
      
      // By Committee
      csvContent += 'BY COMMITTEE\n';
      csvContent += 'Committee,Count,Percentage\n';
      reportData.byCommittee.forEach(committee => {
        csvContent += `${committee.name},${committee.count},${committee.percentage}%\n`;
      });
      csvContent += '\n';
      
      // By Date
      csvContent += 'BY DATE\n';
      csvContent += 'Date,Check-ins,Unique Volunteers\n';
      reportData.byDate.forEach(dateData => {
        csvContent += `${dateData.date},${dateData.count},${dateData.uniqueVolunteers}\n`;
      });
      csvContent += '\n';
      
      // Top Volunteers
      csvContent += 'TOP VOLUNTEERS\n';
      csvContent += 'Name,Committee,Attendance Count,Last Attendance\n';
      reportData.topVolunteers.forEach(volunteer => {
        csvContent += `${volunteer.name},${volunteer.committee},${volunteer.attendanceCount},${Utils.Date.format(volunteer.lastAttendance, 'date')}\n`;
      });
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `attendance_report_${reportData.period}_${Utils.Date.format(new Date(), 'date')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.Notify.success('Report exported successfully');
      
    } catch (error) {
      Utils.Notify.error('Export failed: ' + error.message);
      throw error;
    }
  },
  
  // Generate volunteer summary report
  async generateVolunteerSummary() {
    try {
      const volunteers = await Storage.getAllVolunteers();
      const allAttendance = await Storage.getAllAttendance();
      
      const volunteerSummaries = await Promise.all(
        volunteers.map(async volunteer => {
          const attendance = allAttendance.filter(record => 
            record.volunteerId === volunteer.id
          );
          
          return {
            ...volunteer,
            totalAttendance: attendance.length,
            lastAttendance: attendance.length > 0 ? 
              attendance.reduce((latest, record) => 
                new Date(record.dateTime) > new Date(latest.dateTime) ? record : latest
              ).dateTime : null,
            averageMonthlyAttendance: this.calculateMonthlyAverage(attendance)
          };
        })
      );
      
      return volunteerSummaries.sort((a, b) => b.totalAttendance - a.totalAttendance);
      
    } catch (error) {
      console.error('Error generating volunteer summary:', error);
      throw error;
    }
  },
  
  // Calculate monthly average attendance for a volunteer
  calculateMonthlyAverage(attendance) {
    if (attendance.length === 0) return 0;
    
    const byMonth = Utils.Array.groupBy(attendance, record => {
      const date = new Date(record.dateTime);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    
    const months = Object.keys(byMonth);
    if (months.length === 0) return 0;
    
    const totalAttendance = Object.values(byMonth).reduce((sum, records) => 
      sum + records.length, 0
    );
    
    return Math.round(totalAttendance / months.length);
  },
  
  // Generate event summary report
  async generateEventSummary() {
    try {
      const events = await Storage.getAllEvents();
      const allAttendance = await Storage.getAllAttendance();
      
      const eventSummaries = await Promise.all(
        events.map(async event => {
          const attendance = allAttendance.filter(record => 
            record.eventId === event.id
          );
          
          return {
            ...event,
            totalAttendance: attendance.length,
            uniqueVolunteers: Utils.Array.unique(attendance, 'volunteerId').length,
            attendanceRate: await this.calculateEventAttendanceRate(event.id)
          };
        })
      );
      
      return eventSummaries.sort((a, b) => new Date(b.date) - new Date(a.date));
      
    } catch (error) {
      console.error('Error generating event summary:', error);
      throw error;
    }
  },
  
  // Calculate attendance rate for an event
  async calculateEventAttendanceRate(eventId) {
    try {
      const attendance = await Storage.getAttendanceByEvent(eventId);
      const totalVolunteers = await Storage.getVolunteerCount();
      
      if (totalVolunteers === 0) return 0;
      
      return Math.round((attendance.length / totalVolunteers) * 100);
      
    } catch (error) {
      console.error('Error calculating attendance rate:', error);
      return 0;
    }
  },
  
  // Generate dashboard statistics
  async generateDashboardStats() {
    try {
      const today = Utils.Date.today();
      const todayAttendance = await Storage.getTodayAttendance();
      const totalVolunteers = await Storage.getVolunteerCount();
      const totalEvents = (await Storage.getAllEvents()).length;
      const weeklyStats = await Storage.getAttendanceStats('week');
      
      return {
        today: {
          checkIns: todayAttendance.length,
          attendanceRate: totalVolunteers > 0 ? 
            Math.round((todayAttendance.length / totalVolunteers) * 100) : 0
        },
        totals: {
          volunteers: totalVolunteers,
          events: totalEvents,
          allTimeAttendance: (await Storage.getAllAttendance()).length
        },
        weekly: {
          checkIns: weeklyStats.totalRecords,
          uniqueVolunteers: weeklyStats.uniqueVolunteers,
          averageDaily: Math.round(weeklyStats.totalRecords / 7)
        }
      };
      
    } catch (error) {
      console.error('Error generating dashboard stats:', error);
      return null;
    }
  }
};