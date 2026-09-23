import React from 'react';
import { Tabs } from 'expo-router';
import { Compass, Map, SlidersHorizontal } from 'lucide-react-native';
import { useMobileI18n } from '../../context/MobileI18nContext';

export default function TabLayout() {
  const { lang, t } = useMobileI18n();

  const itineraryTitle = lang === 'es' ? 'Itinerario' : 'Itinerary';
  const mapTitle = lang === 'es' ? 'Mapa' : 'Map';
  const assistantTitle = lang === 'es' ? 'Asistente' : 'Assistant';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: '#1e293b',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: itineraryTitle,
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: mapTitle,
          tabBarIcon: ({ color, size }) => <Map color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: assistantTitle,
          tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
