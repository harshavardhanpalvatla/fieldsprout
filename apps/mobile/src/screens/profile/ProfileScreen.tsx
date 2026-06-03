import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Card, Chip, Button, Divider, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { authApi } from '../../api/auth';
import { attendanceApi } from '../../api/attendance';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';

interface AttendanceRecord {
  id: string;
  workDate?: string;  // API returns workDate
  date?: string;      // backward compat
  checkinAt: string;
  checkoutAt?: string;
  durationMinutes?: number;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

function getRoleBadgeColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'sales_rep':
    case 'rep':
      return ds.primary;
    case 'manager':
      return '#1565C0';
    case 'admin':
      return '#6A1B9A';
    default:
      return ds.textMuted;
  }
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    sales_rep: 'Sales Rep',
    rep: 'Sales Rep',
    manager: 'Manager',
    admin: 'Admin',
  };
  return map[role?.toLowerCase()] ?? role ?? 'Staff';
}

export function ProfileScreen() {
  const { user, clearAuth } = useAuthStore();
  const { isCheckedIn, attendance } = useAttendanceStore();

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  async function loadAttendanceHistory() {
    setHistoryLoading(true);
    try {
      const { apiClient } = await import('../../api/client');
      const histRes = await apiClient.get('/attendance', { params: { pageSize: 7 } });
      const data = histRes.data?.data ?? [];
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail — attendance history is optional
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      setError('Logout failed, but you have been signed out locally');
    } finally {
      clearAuth();
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  const initials = getInitials(user.name);
  const roleColor = getRoleBadgeColor(user.role);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <Card style={styles.profileCard} mode="elevated">
        <Card.Content style={styles.profileContent}>
          <View style={[styles.avatar, { backgroundColor: `${roleColor}22` }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
          </View>
          <Text style={[type.heading, { marginBottom: 4 }]}>{user.name}</Text>
          <Text style={[type.bodyMuted, { marginBottom: 12 }]}>{user.phone}</Text>
          <Chip
            style={[styles.roleBadge, { backgroundColor: `${roleColor}18` }]}
            textStyle={[type.label, { color: roleColor }]}
            compact
          >
            {formatRole(user.role)}
          </Chip>

          <View style={styles.infoRow}>
            {user.territory && (
              <View style={styles.infoItem}>
                <Ionicons name="map-outline" size={16} color={ds.textMuted} />
                <Text style={[type.small, { color: ds.textMuted }]}>{user.territory}</Text>
              </View>
            )}
            {user.state && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={16} color={ds.textMuted} />
                <Text style={[type.small, { color: ds.textMuted }]}>{user.state}</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Today's attendance status */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={ds.primary} />
            <Text style={[type.subtitle, { marginLeft: 8 }]}>Today's Attendance</Text>
          </View>
          <View style={styles.attendanceStatus}>
            <View style={[styles.statusDot, { backgroundColor: isCheckedIn ? ds.green : '#BDBDBD' }]} />
            <Text style={[type.body, { color: isCheckedIn ? ds.green : ds.textMuted }]}>
              {isCheckedIn ? 'Working' : 'Not started'}
            </Text>
            {attendance?.checkinAt && (
              <Text style={[type.small, { color: ds.textMuted, marginLeft: 8 }]}>
                Started at {formatTime(attendance.checkinAt)}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Attendance history */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={ds.primary} />
            <Text style={[type.subtitle, { marginLeft: 8 }]}>Last 7 Days</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color={ds.primary} style={{ marginTop: 8 }} />
          ) : attendanceHistory.length === 0 ? (
            <Text style={[type.small, { textAlign: 'center', paddingVertical: 8 }]}>No attendance records found</Text>
          ) : (
            attendanceHistory.map((record, index) => (
              <View key={record.id}>
                <View style={styles.historyRow}>
                  <Text style={[type.buttonSM, { color: ds.text, minWidth: 80 }]}>{formatDate(record.workDate ?? record.date ?? record.checkinAt)}</Text>
                  <View style={styles.historyTimes}>
                    <Text style={[type.small, { color: ds.textMuted }]}>
                      In: {formatTime(record.checkinAt)}
                    </Text>
                    {record.checkoutAt && (
                      <Text style={[type.small, { color: ds.textMuted }]}>
                        Out: {formatTime(record.checkoutAt)}
                      </Text>
                    )}
                    {(record.durationMinutes != null || (record.checkoutAt && record.checkinAt)) && (
                      <Chip compact style={styles.durationChip} textStyle={styles.durationText}>
                        {record.durationMinutes != null
                          ? formatDuration(record.durationMinutes)
                          : formatDuration(Math.round((new Date(record.checkoutAt!).getTime() - new Date(record.checkinAt).getTime()) / 60000))
                        }
                      </Chip>
                    )}
                  </View>
                </View>
                {index < attendanceHistory.length - 1 && (
                  <Divider style={{ marginVertical: 4 }} />
                )}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* App version */}
      <Text style={[type.small, { textAlign: 'center', marginBottom: 16 }]}>FieldSprout v1.0.0</Text>

      {/* Logout */}
      <PressableScale
        onPress={handleLogout}
        disabled={loggingOut}
        haptic="warning"
        scale={0.97}
        style={styles.logoutButton}
      >
        <View style={styles.logoutButtonInner}>
          {loggingOut
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={[type.button, { color: '#fff' }]}>Logout</Text>
              </>
          }
        </View>
      </PressableScale>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.snackbar}
      >
        {error}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ds.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: ds.surface,
    borderRadius: 16,
    marginBottom: 12,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 30,
  },
  roleBadge: {
    marginBottom: 12,
    height: 30,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionCard: {
    backgroundColor: ds.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  durationChip: {
    backgroundColor: '#E8F5E9',
    height: 24,
  },
  durationText: {
    color: ds.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  logoutButton: {
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  logoutButtonInner: {
    backgroundColor: ds.red,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  snackbar: { backgroundColor: ds.red },
});
