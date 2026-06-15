import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PostScreen from './src/screens/PostScreen';
import SavedScreen from './src/screens/SavedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import CityPickerScreen from './src/screens/CityPickerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#f3f4f6',
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { on: string; off: string }> = {
            Home: { on: 'home', off: 'home-outline' },
            Search: { on: 'search', off: 'search-outline' },
            Post: { on: 'add-circle', off: 'add-circle-outline' },
            Saved: { on: 'heart', off: 'heart-outline' },
            Profile: { on: 'person', off: 'person-outline' },
          };
          const name = route.name as keyof typeof icons;
          const iconName = focused ? icons[name]?.on : icons[name]?.off;
          return (
            <Ionicons
              name={(iconName as any) ?? 'ellipse-outline'}
              size={name === 'Post' ? 30 : size}
              color={name === 'Post' ? '#f97316' : color}
            />
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
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="CityPicker"
          component={CityPickerScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
