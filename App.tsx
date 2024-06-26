import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Snackbar from 'react-native-snackbar';

const API_URL = 'https://api.flickr.com/services/rest/';
const API_KEY = '6f102c62f41998d151e5a1b48713cf13'; // Replace with your actual API key

const HomeScreen = ({ navigation }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPhotos = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, {
        params: {
          method: 'flickr.photos.getRecent',
          per_page: 20,
          page: pageNumber,
          api_key: API_KEY,
          format: 'json',
          nojsoncallback: 1,
          extras: 'url_s',
        },
      });
      const newPhotos = response.data.photos.photo;

      // Save fetched photos to AsyncStorage for caching
      await AsyncStorage.setItem('cachedPhotos', JSON.stringify(newPhotos));

      // Update state
      setPhotos((prevPhotos) => [...prevPhotos, ...newPhotos]);
    } catch (error) {
      console.error('Error fetching photos:', error);
      Snackbar.show({
        text: 'Network request failed. Retry?',
        duration: Snackbar.LENGTH_INDEFINITE,
        action: {
          text: 'Retry',
          onPress: () => fetchPhotos(pageNumber),
        },
      });

      // Attempt to retrieve cached photos if available
      const cachedPhotos = await AsyncStorage.getItem('cachedPhotos');
      if (cachedPhotos) {
        setPhotos(JSON.parse(cachedPhotos));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos(page);
  }, [page]);

  const handleLoadMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const handleSearchNavigation = () => {
    navigation.navigate('Search', { searchQuery });
  };

  if (loading && page === 1) {
    return <ActivityIndicator style={styles.loader} size="large" color="#0000ff" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search photos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Button
          title="Search"
          onPress={handleSearchNavigation}
        />
      </View>
      <FlatList
        data={photos}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url_s }}
            style={styles.image}
          />
        )}
        numColumns={2}
        contentContainerStyle={styles.flatlistContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && page !== 1 && <ActivityIndicator style={styles.loader} size="large" color="#0000ff" />}
      />
    </SafeAreaView>
  );
};

const SearchScreen = ({ route }) => {
  const { searchQuery } = route.params;
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, {
        params: {
          method: 'flickr.photos.search',
          per_page: 20,
          page: 1,
          api_key: API_KEY,
          format: 'json',
          nojsoncallback: 1,
          extras: 'url_s',
          text: searchQuery.trim(),
        },
      });
      const searchResults = response.data.photos.photo;

      // Save fetched search results to AsyncStorage for caching
      await AsyncStorage.setItem('cachedSearchResults', JSON.stringify(searchResults));

      // Update state with search results
      setPhotos(searchResults);
    } catch (error) {
      console.error('Error fetching search results:', error);
      Snackbar.show({
        text: 'Network request failed. Retry?',
        duration: Snackbar.LENGTH_INDEFINITE,
        action: {
          text: 'Retry',
          onPress: handleSearch,
        },
      });

      // Attempt to retrieve cached search results if available
      const cachedSearchResults = await AsyncStorage.getItem('cachedSearchResults');
      if (cachedSearchResults) {
        setPhotos(JSON.parse(cachedSearchResults));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#0000ff" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url_s }}
            style={styles.image}
          />
        )}
        numColumns={2}
        contentContainerStyle={styles.flatlistContent}
      />
    </SafeAreaView>
  );
};

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  loader: {
    marginVertical: 20,
  },
  image: {
    width: '45%',
    aspectRatio: 1, // Square aspect ratio
    margin: '2.5%',
    borderRadius: 10,
  },
  flatlistContent: {
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});

export default App;
