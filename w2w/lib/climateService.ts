import { LocationData } from '@/hooks/useLocation';

export interface ClimateData {
  climateZone: string;
  temperature: {
    average: number;
    min: number;
    max: number;
    unit: 'C' | 'F';
  };
  humidity: number;
  precipitation: number;
  recyclingGuidelines: {
    composting: boolean;
    plasticRecycling: string[];
    hazardousWaste: string[];
    seasonalConsiderations: string[];
  };
  disposalTips: string[];
}

// Climate zone classification based on Köppen climate classification
const getClimateZone = (lat: number, lon: number, temp: number, precipitation: number): string => {
  // Simplified climate zone determination based on latitude and basic weather data
  if (lat > 66.5) return 'Polar';
  if (lat > 50) return 'Subarctic';
  if (lat > 40) return 'Temperate';
  if (lat > 23.5) return 'Subtropical';
  if (lat > -23.5) return 'Tropical';
  return 'Equatorial';
};

// Get recycling guidelines based on climate zone
const getRecyclingGuidelines = (climateZone: string, temperature: number): ClimateData['recyclingGuidelines'] => {
  const guidelines: Record<string, ClimateData['recyclingGuidelines']> = {
    'Polar': {
      composting: false,
      plasticRecycling: ['PET', 'HDPE', 'PP'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals'],
      seasonalConsiderations: ['Limited outdoor composting', 'Indoor recycling only in winter']
    },
    'Subarctic': {
      composting: true,
      plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint'],
      seasonalConsiderations: ['Seasonal composting', 'Winter storage for hazardous waste']
    },
    'Temperate': {
      composting: true,
      plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE', 'PS'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint', 'Pesticides'],
      seasonalConsiderations: ['Year-round composting', 'Seasonal collection schedules']
    },
    'Subtropical': {
      composting: true,
      plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE', 'PS', 'PVC'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint', 'Pesticides', 'Pool chemicals'],
      seasonalConsiderations: ['Year-round composting', 'Heat-sensitive material storage']
    },
    'Tropical': {
      composting: true,
      plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE', 'PS', 'PVC'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint', 'Pesticides', 'Pool chemicals'],
      seasonalConsiderations: ['Year-round composting', 'Humidity control for storage', 'Rainy season considerations']
    },
    'Equatorial': {
      composting: true,
      plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE', 'PS', 'PVC'],
      hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint', 'Pesticides', 'Pool chemicals'],
      seasonalConsiderations: ['Year-round composting', 'High humidity storage', 'Constant temperature considerations']
    }
  };

  return guidelines[climateZone] || guidelines['Temperate'];
};

// Get disposal tips based on climate
const getDisposalTips = (climateZone: string, temperature: number, humidity: number): string[] => {
  const tips: string[] = [];

  // Temperature-based tips
  if (temperature < 0) {
    tips.push('Store recyclables indoors to prevent freezing');
    tips.push('Batteries perform poorly in cold - store at room temperature');
  } else if (temperature > 30) {
    tips.push('Store hazardous materials in cool, dry places');
    tips.push('Plastic containers may degrade faster in heat');
  }

  // Humidity-based tips
  if (humidity > 70) {
    tips.push('Use airtight containers for food waste composting');
    tips.push('Store paper products in dry areas to prevent mold');
  }

  // Climate zone specific tips
  switch (climateZone) {
    case 'Polar':
      tips.push('Limited recycling facilities - check local availability');
      tips.push('Energy-intensive recycling may not be available');
      break;
    case 'Subarctic':
      tips.push('Seasonal collection schedules may apply');
      tips.push('Winter storage considerations for hazardous waste');
      break;
    case 'Temperate':
      tips.push('Most recycling programs available year-round');
      tips.push('Seasonal variations in collection schedules');
      break;
    case 'Subtropical':
      tips.push('Heat-sensitive materials need special storage');
      tips.push('Increased risk of material degradation');
      break;
    case 'Tropical':
      tips.push('High humidity requires careful storage');
      tips.push('Rainy season may affect collection schedules');
      break;
    case 'Equatorial':
      tips.push('Constant high humidity and temperature');
      tips.push('Rapid decomposition of organic materials');
      break;
  }

  return tips;
};

// Mock weather data - in a real app, you'd call a weather API
const getMockWeatherData = (lat: number, lon: number) => {
  // Simple mock data based on latitude for demonstration
  const baseTemp = 30 - (Math.abs(lat) * 0.5); // Temperature decreases with latitude
  const variation = Math.sin(lon * 0.01) * 10; // Some variation based on longitude
  
  return {
    temperature: Math.round(baseTemp + variation),
    humidity: Math.round(50 + Math.sin(lat * 0.1) * 30),
    precipitation: Math.round(Math.abs(Math.sin(lat * 0.05)) * 100)
  };
};

export const getClimateData = async (location: LocationData): Promise<ClimateData> => {
  try {
    // In a real implementation, you would call a weather API here
    // For now, we'll use mock data
    const weatherData = getMockWeatherData(location.latitude, location.longitude);
    
    const climateZone = getClimateZone(
      location.latitude, 
      location.longitude, 
      weatherData.temperature, 
      weatherData.precipitation
    );

    const recyclingGuidelines = getRecyclingGuidelines(climateZone, weatherData.temperature);
    const disposalTips = getDisposalTips(climateZone, weatherData.temperature, weatherData.humidity);

    return {
      climateZone,
      temperature: {
        average: weatherData.temperature,
        min: weatherData.temperature - 10,
        max: weatherData.temperature + 10,
        unit: 'C'
      },
      humidity: weatherData.humidity,
      precipitation: weatherData.precipitation,
      recyclingGuidelines,
      disposalTips
    };
  } catch (error) {
    console.error('Error getting climate data:', error);
    throw new Error('Failed to get climate data');
  }
};

// Real weather API integration (commented out for now)
/*
export const getRealWeatherData = async (location: LocationData): Promise<ClimateData> => {
  try {
    // Example using OpenWeatherMap API
    const API_KEY = 'your_api_key_here';
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    
    const climateZone = getClimateZone(
      location.latitude, 
      location.longitude, 
      data.main.temp, 
      data.rain?.['1h'] || 0
    );

    const recyclingGuidelines = getRecyclingGuidelines(climateZone, data.main.temp);
    const disposalTips = getDisposalTips(climateZone, data.main.temp, data.main.humidity);

    return {
      climateZone,
      temperature: {
        average: Math.round(data.main.temp),
        min: Math.round(data.main.temp_min),
        max: Math.round(data.main.temp_max),
        unit: 'C'
      },
      humidity: data.main.humidity,
      precipitation: data.rain?.['1h'] || 0,
      recyclingGuidelines,
      disposalTips
    };
  } catch (error) {
    console.error('Error getting real weather data:', error);
    throw new Error('Failed to get weather data');
  }
};
*/
