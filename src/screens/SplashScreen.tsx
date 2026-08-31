import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function SplashScreen({ navigation }: any) {
  const handleContinue = () => {
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🎮</Text>
          </View>
          <Text style={styles.title}>Game Manager</Text>
          <Text style={styles.subtitle}>Sistema de Gestão para Casa de Jogos</Text>
        </View>

        <View style={styles.creatorInfo}>
          <Text style={styles.creatorLabel}>Criado por</Text>
          <Text style={styles.creatorName}>Cássio Neto</Text>
          
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>cassio.pro99@gmail.com</Text>
          </View>
          
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📱</Text>
            <Text style={styles.contactText}>+244 940318322</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Versão 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066CC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#E6F4FE',
    textAlign: 'center',
  },
  creatorInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 30,
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  creatorLabel: {
    fontSize: 14,
    color: '#E6F4FE',
    marginBottom: 5,
  },
  creatorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#E6F4FE',
  },
  button: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#0066CC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  version: {
    fontSize: 12,
    color: '#E6F4FE',
  },
});
