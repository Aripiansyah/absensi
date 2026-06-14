import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from './firebaseConfig.js';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMahasiswa: 0, hadirHariIni: 0, terlambatHariIni: 0, alfaHariIni: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentAbsen, setRecentAbsen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDashboardData = async () => {
      try {
        setLoading(true);

        // Ambil data hari ini (real-time listener)
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        // Real-time listener untuk absensi hari ini
        const q = query(
          collection(db, 'absensi'),
          where('tanggal', '==', today),
          orderBy('timestamp', 'desc'),
          limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const absensiData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Hitung statistik hari ini
          let hadir = 0, terlambat = 0, alfa = 0;
          absensiData.forEach(item => {
            if (item.status === 'Hadir') hadir++;
            if (item.status === 'Terlambat') terlambat++;
            if (item.status === 'Alfa') alfa++;
          });

          // Set recent absensi
          setRecentAbsen(absensiData);
          
          // Update stats
          setStats({
            totalMahasiswa: 120, // TODO: Query dari collection mahasiswa
            hadirHariIni: hadir,
            terlambatHariIni: terlambat,
            alfaHariIni: alfa
          });
        });

        // Ambil data mingguan untuk chart (one-time fetch)
        const weekChartData = await getWeeklyData();
        setChartData(weekChartData);

        setLoading(false);

        // Cleanup listener saat component unmount
        return () => unsubscribe();

      } catch (error) {
        console.error("Gagal mengambil data database:", error);
        setLoading(false);
      }
    };

    getDashboardData();
  }, []);

  // Fungsi untuk ambil data mingguan
  const getWeeklyData = async () => {
    const today = new Date();
    const weekData = {};

    // Hari-hari dalam seminggu
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Loop 7 hari ke belakang
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = hari[date.getDay()];

      const q = query(
        collection(db, 'absensi'),
        where('tanggal', '==', dateStr)
      );

      const snapshot = await getDocs(q);
      let hadir = 0, terlambat = 0, alfa = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Hadir') hadir++;
        if (data.status === 'Terlambat') terlambat++;
        if (data.status === 'Alfa') alfa++;
      });

      weekData[dayName] = { Hadir: hadir, Terlambat: terlambat, Alfa: alfa };
    }

    // Format data untuk chart
    return Object.entries(weekData).map(([hari, data]) => ({ hari, ...data })).reverse();
  };

  if (loading) {
    return <div style={styles.loading}>Memuat Data dari Database...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard Absensi Mahasiswa</h1>
      
      {/* 1. Ringkasan Kartu Info (Koleksi Mahasiswa & Absensi) */}
      <div style={styles.cardContainer}>
        <div style={{ ...styles.card, borderLeft: '5px solid #3b82f6' }}>
          <h3>Total Mahasiswa</h3>
          <p style={styles.cardValue}>{stats.totalMahasiswa}</p>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #10b981' }}>
          <h3>Hadir Hari Ini</h3>
          <p style={styles.cardValue}>{stats.hadirHariIni}</p>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #f59e0b' }}>
          <h3>Terlambat</h3>
          <p style={styles.cardValue}>{stats.terlambatMenit || stats.terlambatHariIni}</p>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #ef4444' }}>
          <h3>Alfa</h3>
          <p style={styles.cardValue}>{stats.alfaHariIni}</p>
        </div>
      </div>

      {/* 2. Grafik Statistik Kebiasaan Absensi (Berdiri/Vertikal sesuai keinginanmu) */}
      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>Statistik Kehadiran Mingguan</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hari" />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Diagram Batang Berdiri */}
              <Bar dataKey="Hadir" fill="#10b981" />
              <Bar dataKey="Terlambat" fill="#f59e0b" />
              <Bar dataKey="Alfa" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Tabel Data Absensi Terbaru (Real-time/Log terakhir) */}
      <div style={styles.tableSection}>
        <h2 style={styles.sectionTitle}>Aktivitas Absensi Terbaru</h2>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>NIM</th>
              <th style={styles.th}>Nama</th>
              <th style={styles.th}>Kelas</th>
              <th style={styles.th}>Jam Masuk</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentAbsen.map((absen) => (
              <tr key={absen.id} style={styles.tr}>
                <td style={styles.td}>{absen.nim}</td>
                <td style={styles.td}>{absen.nama}</td>
                <td style={styles.td}>{absen.kelas}</td>
                <td style={styles.td}>{absen.jamAbsen}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: absen.status === 'Hadir' ? '#d1fae5' : absen.status === 'Terlambat' ? '#fef3c7' : '#fee2e2',
                    color: absen.status === 'Hadir' ? '#065f46' : absen.status === 'Terlambat' ? '#92400e' : '#7f1d1d'
                  }}>
                    {absen.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline CSS Styles untuk kemudahan penggunaan langsung
const styles = {
  container: { padding: '24px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1e293b' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#334155' },
  cardContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cardValue: { fontSize: '28px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#0f172a' },
  chartSection: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' },
  tableSection: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f1f5f9' },
  th: { padding: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0', fontWeight: '600' },
  td: { padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#334155' },
  tr: { '&:hover': { backgroundColor: '#f8fafc' } },
  badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }
};