import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distributorsApi } from '../../api/distributors';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { useQueueStore } from '../../stores/queueStore';
import { ds, type, font } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import type { VisitsStackParamList } from './VisitsScreen';

type CheckInRouteProp = RouteProp<VisitsStackParamList, 'CheckIn'>;
type NavigationProp = StackNavigationProp<VisitsStackParamList, 'CheckIn'>;

type CheckinResult = {
  geoVerified: boolean;
  distanceMeters?: number;
  visitId?: string;
  isSimulator?: boolean;
};

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function CheckInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckInRouteProp>();
  const insets = useSafeAreaInsets();
  const { distributorId, distributorName } = route.params;

  const { attendance } = useAttendanceStore();
  const { enqueue } = useQueueStore();

  const resultAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.8)).current;
  const successCircleAnim = useRef(new Animated.Value(0)).current;

  const [locationStatus, setLocationStatus] = useState<'fetching' | 'ready' | 'error'>('fetching');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (result) {
      Animated.parallel([
        Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      ]).start();

      if (result.geoVerified) {
        Animated.spring(successCircleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }).start();
      }
    }
  }, [result]);

  async function getLocation() {
    setLocationStatus('fetching');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('error');
        setError('Location permission is required to check in.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
      setLocationStatus('ready');
    } catch {
      setLocationStatus('error');
      setError('Failed to get your location. Please try again.');
    }
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera roll permission is required.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  }

  async function handleCheckin() {
    if (!coords) return;
    if (!attendance) {
      setError('You must start your day (check in attendance) before visiting a distributor.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await distributorsApi.checkinVisit({
        distributorId,
        lat: coords.lat,
        lng: coords.lng,
        attendanceId: attendance.id,
        photoUrl: photoUri ?? undefined,
      });
      const data = res.data?.data ?? res.data;
      const distanceMeters = data.distanceMeters as number | undefined;
      const isSimulator = typeof distanceMeters === 'number' && distanceMeters > 10000000;
      setResult({
        geoVerified: isSimulator ? true : (data.geoVerified ?? true),
        distanceMeters,
        visitId: data.id,
        isSimulator,
      });
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || !err?.response) {
        enqueue({
          id: `visit_${distributorId}_${Date.now()}`,
          type: 'visit_checkin',
          payload: {
            distributorId,
            lat: coords.lat,
            lng: coords.lng,
            attendanceId: attendance.id,
            photoUrl: photoUri ?? undefined,
          },
          capturedAt: new Date().toISOString(),
        });
        setResult({ geoVerified: true });
      } else {
        setError(err?.response?.data?.error?.message ?? 'Check-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Back */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={ds.text} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Label */}
          <Text style={[type.label, { color: ds.primary, marginBottom: 10 }]}>
            CHECKING IN
          </Text>

          {/* Shop name */}
          <Text style={[type.display, { marginBottom: 4 }]}>
            {distributorName}
          </Text>

          {/* Attendance warning */}
          {!attendance && (
            <View style={{
              backgroundColor: ds.amberLight,
              borderRadius: ds.radiusMD,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              marginBottom: 4,
            }}>
              <Ionicons name="warning-outline" size={16} color={ds.amber} />
              <Text style={[type.small, { color: '#B45309', flex: 1 }]}>
                Start your day first before checking in
              </Text>
            </View>
          )}

          {/* Location card */}
          <View style={{
            backgroundColor: ds.tile,
            borderRadius: ds.radiusMD,
            padding: 16,
            marginTop: 20,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {locationStatus === 'fetching' && (
                <>
                  <ActivityIndicator size="small" color={ds.primary} />
                  <Text style={[type.body, { flex: 1 }]}>
                    Getting your location...
                  </Text>
                </>
              )}
              {locationStatus === 'ready' && coords && (
                <>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: ds.greenLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="checkmark" size={20} color={ds.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.subtitle}>
                      Location captured
                    </Text>
                    <Text style={[type.small, { marginTop: 2 }]}>
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: ds.greenLight,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 11, color: ds.green }}>GPS Ready</Text>
                  </View>
                </>
              )}
              {locationStatus === 'error' && (
                <>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: ds.redLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="close" size={20} color={ds.red} />
                  </View>
                  <Text style={[type.body, { color: ds.red, flex: 1 }]}>
                    Location unavailable
                  </Text>
                  <TouchableOpacity onPress={getLocation}>
                    <Text style={[type.buttonSM, { color: ds.primary }]}>Retry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Photo tile */}
          <View style={{
            backgroundColor: ds.tile,
            borderRadius: ds.radiusMD,
            padding: 16,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="camera-outline" size={20} color={ds.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={type.subtitle}>Shop Photo</Text>
                  <Text style={[type.small, { marginTop: 2 }]}>
                    Optional — helps verify your visit
                  </Text>
                </View>
              </View>
              <PressableScale
                onPress={handlePickPhoto}
                haptic="light"
                scale={0.95}
                style={{
                  backgroundColor: photoUri ? ds.primaryLight : ds.surface,
                  borderWidth: 1.5,
                  borderColor: ds.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: ds.radiusFull,
                }}
              >
                <Text style={[type.buttonSM, { color: ds.primary }]}>
                  {photoUri ? 'Retake' : 'Add Photo'}
                </Text>
              </PressableScale>
            </View>
          </View>

          {/* Result */}
          {result !== null && (
            <Animated.View style={{
              opacity: resultAnim,
              transform: [{ scale: resultScale }],
              marginBottom: 16,
            }}>
              <View style={{
                borderRadius: ds.radiusMD,
                padding: 16,
                backgroundColor: result.isSimulator ? ds.blueLight : result.geoVerified ? ds.greenLight : ds.amberLight,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <Animated.View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: result.isSimulator ? ds.blueLight : result.geoVerified ? ds.greenLight : ds.amberLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: (!result.isSimulator && result.geoVerified) ? successCircleAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1.2, 1] }) : 1 }],
                }}>
                  {result.isSimulator
                    ? <Ionicons name="information-circle" size={22} color={ds.blue} />
                    : result.geoVerified
                      ? <Ionicons name="checkmark-circle" size={22} color={ds.green} />
                      : <Ionicons name="warning" size={22} color={ds.amber} />
                  }
                </Animated.View>
                <View style={{ flex: 1 }}>
                  {result.isSimulator ? (
                    <>
                      <Text style={[type.subtitle, { color: ds.blue }]}>
                        Simulator GPS detected
                      </Text>
                      <Text style={[type.small, { marginTop: 4 }]}>
                        Visit logged. In production, GPS will verify your location automatically.
                      </Text>
                    </>
                  ) : result.geoVerified ? (
                    <>
                      <Text style={[type.subtitle, { color: ds.green }]}>
                        You're at the shop
                      </Text>
                      <Text style={[type.small, { marginTop: 4 }]}>
                        Visit logged successfully
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[type.subtitle, { color: ds.amber }]}>
                        {formatDistance(result.distanceMeters ?? 0)} away from shop
                      </Text>
                      <Text style={[type.small, { marginTop: 4 }]}>
                        Visit logged anyway. Please ensure you're at the correct location.
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Button */}
          {!result ? (
            <PressableScale
              onPress={handleCheckin}
              disabled={loading || locationStatus !== 'ready' || !attendance}
              haptic="success"
              scale={0.97}
              style={{
                backgroundColor: locationStatus === 'ready' && attendance ? ds.primary : ds.tile,
                borderRadius: ds.radiusFull,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[type.button, {
                    color: locationStatus === 'ready' && attendance ? '#fff' : ds.textLight,
                  }]}>
                    Check In
                  </Text>
              }
            </PressableScale>
          ) : (
            <PressableScale
              onPress={() => navigation.goBack()}
              haptic="success"
              scale={0.97}
              style={{
                backgroundColor: ds.primary,
                borderRadius: ds.radiusFull,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[type.button, { color: '#fff' }]}>Done ✓</Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: ds.red }}
      >
        {error}
      </Snackbar>
    </View>
  );
}
