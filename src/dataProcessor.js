/**
 * Process raw patent data from links.json
 * This utility function organizes the data for better UI display
 */

// Function to determine file type and category
export const categorizeItem = (item) => {
  const name = item.table_name;
  
  // First determine the content type (based on folder patterns and name patterns)
  let contentType = null;
  
  if (name.includes('brf_sum_text_')) {
    contentType = 'Brief Summary';
  } else if (name.includes('claims_')) {
    contentType = 'Claims';
  } else if (name.includes('detail_desc_text_')) {
    contentType = 'Detailed Description';
  } else if (name.includes('draw_desc_text_')) {
    contentType = 'Drawing Description';
  } else if (name.includes('abstract')) {
    contentType = 'Abstract';
  }
  
  // For items that don't fit into a year-based content type, categorize by functional area
  let category = null;
  
  if (contentType) {
    category = 'Content';
  } else if (name.includes('inventor') || name.includes('attorney') || name.includes('lawyer') || 
      name.includes('assignee') || name.includes('applicant') || name.includes('examiner')) {
    category = 'People';
  } else if (name.includes('location') || name.includes('geography')) {
    category = 'Geography';
  } else if (name.includes('cpc') || name.includes('uspc') || name.includes('ipc') || name.includes('wipo')) {
    category = 'Classification';
  } else if (name.includes('citation') || name.includes('reference')) {
    category = 'Citations';
  } else if (name.includes('gov_interest') || name.includes('federal')) {
    category = 'Government';
  } else if (name.includes('priority') || name.includes('rel_') || name.includes('term') || name.includes('pct')) {
    category = 'Legal';
  } else if (name.includes('persistent') || name.includes('crosswalk') || name.includes('granted_pgpubs')) {
    category = 'Mapping';
  } else if (name.includes('figures') || name.includes('botanic')) {
    category = 'Other Documentation';
  } else {
    category = 'General';
  }
  
  // Determine the patent type (granted vs pre-grant)
  const type = name.startsWith('pg_') ? 'pregrant' : 'granted';
  
  // For content types, extract the year if present
  let year = null;
  if (contentType) {
    const yearMatch = name.match(/_(\d{4})$/);
    if (yearMatch) {
      year = yearMatch[1];
    }
  }
  
  // Generate a friendly display name
  const displayName = item.table_name
    .replace(/^(g|pg)_/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/_/g, ' ');
  
  return {
    ...item,
    displayName,
    type,
    category,
    contentType,
    year
  };
};

/**
 * Process raw data into a format easier to use in the UI
 */
export const processData = (rawData) => {
  // First, categorize each item
  const categorizedItems = rawData.map(categorizeItem);
  
  // Then, split by patent type and category
  const result = {
    granted: {},
    pregrant: {}
  };
  
  categorizedItems.forEach(item => {
    if (!result[item.type][item.category]) {
      result[item.type][item.category] = [];
    }
    
    result[item.type][item.category].push(item);
  });
  
  return result;
};

/**
 * Get all available years from the data
 */
export const getAvailableYears = (data) => {
  const years = new Set();
  
  ['granted', 'pregrant'].forEach(type => {
    if (data[type] && data[type].Content) {
      data[type].Content.forEach(item => {
        if (item.year) {
          years.add(item.year);
        }
      });
    }
  });
  
  return Array.from(years).sort((a, b) => b - a); // Sort years in descending order
};

/**
 * Get all available content types from the data
 */
export const getContentTypes = (data) => {
  const contentTypes = new Set();
  
  ['granted', 'pregrant'].forEach(type => {
    if (data[type] && data[type].Content) {
      data[type].Content.forEach(item => {
        if (item.contentType) {
          contentTypes.add(item.contentType);
        }
      });
    }
  });
  
  return Array.from(contentTypes).sort();
};