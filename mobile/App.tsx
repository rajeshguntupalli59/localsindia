import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PostScreen from './src/screens/PostScreen';
import SavedScreen from './src/screens/SavedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import CityPickerScreen from './src/screens/CityPickerScreen';
import AdminScreen from './src/screens/AdminScreen';
import ChatScreen from './src/screens/ChatScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import { storage } from './src/lib/storage';
import { isBiometricAvailable, authenticateWithBiometric } from './src/hooks/useBiometric';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopColor: 'rgba(0,0,0,0.07)',
          borderTopWidth: 0.5,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          height: 64 + insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 24,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { on: string; off: string }> = {
            Home:    { on: 'home',            off: 'home-outline'    },
            Search:  { on: 'search',          off: 'search-outline'  },
            Post:    { on: 'add',             off: 'add'             },
            Saved:   { on: 'heart',           off: 'heart-outline'   },
            Profile: { on: 'person',          off: 'person-outline'  },
          };
          const name = route.name as keyof typeof icons;
          const iconName = focused ? icons[name]?.on : icons[name]?.off;

          if (name === 'Post') {
            return (
              <View style={{
                width: 50, height: 50,
                borderRadius: 25,
                backgroundColor: '#f97316',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                shadowColor: '#f97316',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.55,
                shadowRadius: 12,
                elevation: 8,
              }}>
                <Ionicons name="add" size={28} color="white" />
              </View>
            );
          }

          return (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  width: 20, height: 3,
                  borderRadius: 2,
                  backgroundColor: '#f97316',
                }} />
              )}
              <Ionicons
                name={(iconName as any) ?? 'ellipse-outline'}
                size={size}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} initialParams={{ citySlug: 'hyderabad', cityName: 'Hyderabad' }} />
      <Tab.Screen name="Post" component={PostScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'Main' | 'Login' | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await storage.getAccessToken();
    if (!token) {
      setInitialRoute('Login');
      return;
    }
    const biometricEnabled = await storage.getBiometricEnabled();
    if (biometricEnabled) {
      const available = await isBiometricAvailable();
      if (available) {
        const ok = await authenticateWithBiometric();
        if (!ok) {
          await storage.clear();
          setInitialRoute('Login');
          return;
        }
      }
    }
    setInitialRoute('Main');
  };

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: '#111827' }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="CityPicker"
            component={CityPickerScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="MyListings" component={MyListingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
