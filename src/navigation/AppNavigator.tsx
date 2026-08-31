import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Screens
import SplashScreen from "../screens/SplashScreen";
import DashboardScreen from "../screens/DashboardScreen";
import MachinesScreen from "../screens/MachinesScreen";
import MachinesManagementScreen from "../screens/MachinesManagementScreen";
import GamesScreen from "../screens/GamesScreen";
import SessionScreen from "../screens/SessionScreen";
import StartSessionScreen from "../screens/StartSessionScreen";
import CashRegisterScreen from "../screens/CashRegisterScreen";
import ProductsScreen from "../screens/ProductsScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import CleaningScreen from "../screens/CleaningScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PricingScreen from "../screens/PricingScreen";
import LoyaltyScreen from "../screens/LoyaltyScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import HappyHourScreen from "../screens/HappyHourScreen";
import TournamentsScreen from "../screens/TournamentsScreen";
import ExportScreen from "../screens/ExportScreen";
import BackupScreen from "../screens/BackupScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Machines" component={MachinesScreen} />
      <Tab.Screen name="CashRegister" component={CashRegisterScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="MachinesManagement"
          component={MachinesManagementScreen}
          options={{ headerShown: true, title: "Máquinas" }}
        />
        <Stack.Screen
          name="Games"
          component={GamesScreen}
          options={{ headerShown: true, title: "Jogos" }}
        />
        <Stack.Screen
          name="StartSession"
          component={StartSessionScreen}
          options={{ headerShown: true, title: "Iniciar Sessão" }}
        />
        <Stack.Screen
          name="Session"
          component={SessionScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Maintenance"
          component={MaintenanceScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Cleaning"
          component={CleaningScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Pricing"
          component={PricingScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Loyalty"
          component={LoyaltyScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Reservations"
          component={ReservationsScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="HappyHour"
          component={HappyHourScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Tournaments"
          component={TournamentsScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Backup"
          component={BackupScreen}
          options={{ headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
