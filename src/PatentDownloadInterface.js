import { useState, useEffect } from 'react';

// Load the raw data from GitHub or local file
  const getRawData = async () => {
    try {
      // Try window.fs first (for development environment)
      if (window.fs && typeof window.fs.readFile === 'function') {
        try {
          const response = await window.fs.readFile('links.json', { encoding: 'utf8' });
          return JSON.parse(response);
        } catch (fsError) {
          console.warn('Could not read file using window.fs:', fsError);
          // Continue to fallback
        }
      }
      
      // Fetch from GitHub raw URL
      const response = await fetch('https://raw.githubusercontent.com/threndash/patent-download-ui/refs/heads/main/links.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error reading links.json:', error);
      return [];
    }
  };

const PatentDownloadInterface = () => {
  // Content type color schemes for visual distinction
  const contentTypeColors = {
    'Abstract': { bg: '#e0f2fe', border: '#bae6fd', header: '#0ea5e9' },
    'Brief Summary': { bg: '#f0fdf4', border: '#bbf7d0', header: '#16a34a' },
    'Claims': { bg: '#fef3c7', border: '#fde68a', header: '#d97706' },
    'Detailed Description': { bg: '#ede9fe', border: '#ddd6fe', header: '#8b5cf6' },
    'Drawing Description': { bg: '#fae8ff', border: '#f5d0fe', header: '#c026d3' },
    'Other': { bg: '#f1f5f9', border: '#e2e8f0', header: '#64748b' }
  };

  // State variables
  const [activeTab, setActiveTab] = useState("granted");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [data, setData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredYears, setFilteredYears] = useState([]);
  const [availableContentTypes, setAvailableContentTypes] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrolledToCategory, setScrolledToCategory] = useState(null);

  // Categorize each item by type, content type, etc.
  const categorizeItem = (item) => {
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
    } else if (name.includes('patent') || name.includes('application')) {
      category = 'General';
    } else {
      category = 'Other';
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

  // Group similar items into disambiguated and non-disambiguated categories
  const organizeByDisambiguation = (items) => {
    const result = {
      disambiguated: [],
      raw: []
    };
    
    items.forEach(item => {
      if (item.table_name.includes('_not_disambiguated')) {
        result.raw.push(item);
      } else if (item.table_name.includes('_disambiguated')) {
        result.disambiguated.push(item);
      } else {
        // If the item doesn't fall into either category, add it to the main list
        if (!result.main) result.main = [];
        result.main.push(item);
      }
    });
    
    return result;
  };

  // Process the raw data into a structured format with Essentials category
  const processData = (rawData) => {
    // First, categorize each item
    const categorizedItems = rawData.map(categorizeItem);
    
    // Then, split by patent type and category
    const result = {
      granted: {
        Essentials: [] // Initialize Essentials category
      },
      pregrant: {
        Essentials: [] // Initialize Essentials category
      }
    };
    
    // Define the essential files we want in the "Essentials" category
    const essentialFiles = [
      "g_assignee_disambiguated", 
      "g_inventor_disambiguated",
      "g_cpc_at_issue", 
      "g_location_disambiguated",
      "g_us_patent_citation",
      "g_application",
      "g_patent",
      "pg_assignee_disambiguated", 
      "pg_inventor_disambiguated",
      "pg_cpc_at_issue", 
      "pg_location_disambiguated",
      "pg_published_application"
    ];
    
    // Process each item
    categorizedItems.forEach(item => {
      // First check if this is an essential file
      const isEssential = essentialFiles.includes(item.table_name);
      
      // Make sure the category exists in the result
      if (!result[item.type][item.category]) {
        result[item.type][item.category] = [];
      }
      
      // Add to the normal category
      result[item.type][item.category].push(item);
      
      // If it's an essential file, also add to Essentials
      if (isEssential) {
        result[item.type].Essentials.push(item);
      }
    });
    
    // Organize People, Geography categories into disambiguation groups
    ['granted', 'pregrant'].forEach(type => {
      const categories = ['People', 'Geography'];
      categories.forEach(category => {
        if (result[type][category] && result[type][category].length > 0) {
          const organized = organizeByDisambiguation(result[type][category]);
          
          // Replace the original array with the organized structure
          if (organized.disambiguated.length > 0 || organized.raw.length > 0) {
            result[type][category] = organized;
          }
        }
      });
    });
    
    return result;
  };

  // Get all available years from the data
  const getAvailableYears = (data) => {
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

  // Get years available for a specific content type
  const getYearsForContentType = (data, activeTab, contentType) => {
    const years = new Set();
    
    if (data && data[activeTab] && data[activeTab].Content) {
      data[activeTab].Content.forEach(item => {
        if (item.year && (contentType === 'all' || item.contentType === contentType)) {
          years.add(item.year);
        }
      });
    }
    
    return Array.from(years).sort((a, b) => b - a);
  };

  // Get all available content types from the data
  const getContentTypes = (data) => {
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

  // Group People files by person type
  const getPersonType = (tableName) => {
    if (tableName.includes('assignee')) {
      return 'Assignee';
    } else if (tableName.includes('attorney') || tableName.includes('lawyer')) {
      return 'Attorney';
    } else if (tableName.includes('inventor')) {
      return 'Inventor';
    } else if (tableName.includes('applicant')) {
      return 'Applicant';
    } else if (tableName.includes('examiner')) {
      return 'Examiner';
    } else if (tableName.includes('persistent')) {
      return 'Persistent';
    } else {
      return 'Other';
    }
  };

  // Create pairs of disambiguated and raw files for the People category
  const createMatchedPairs = (disambiguated = [], raw = [], main = []) => {
    // Group files by person type
    const groupFilesByType = (files) => {
      const grouped = {};
      
      files.forEach(file => {
        const personType = getPersonType(file.table_name);
        if (!grouped[personType]) {
          grouped[personType] = [];
        }
        grouped[personType].push(file);
      });
      
      return grouped;
    };

    const disGroups = groupFilesByType(disambiguated);
    const rawGroups = groupFilesByType(raw);
    const mainGroups = groupFilesByType(main || []);
    
    // Combine all person types from all arrays
    const allPersonTypes = [...new Set([
      ...Object.keys(disGroups),
      ...Object.keys(rawGroups),
      ...Object.keys(mainGroups)
    ])].sort();
    
    // Create pairs
    return allPersonTypes.map(personType => {
      return {
        personType,
        disambiguated: disGroups[personType] || [],
        raw: rawGroups[personType] || [],
        main: mainGroups[personType] || []
      };
    });
  };

  // Group Content items by content type
  const groupContentByType = (contentItems) => {
    const grouped = {};
    
    contentItems.forEach(item => {
      if (item.contentType) {
        if (!grouped[item.contentType]) {
          grouped[item.contentType] = [];
        }
        grouped[item.contentType].push(item);
      } else {
        if (!grouped['Other']) {
          grouped['Other'] = [];
        }
        grouped['Other'].push(item);
      }
    });
    
    return grouped;
  };

  // Sort content types in a specific order
  const sortContentTypes = (groupedContent) => {
    const order = [
      'Abstract',
      'Brief Summary',
      'Claims',
      'Detailed Description',
      'Drawing Description',
      'Other'
    ];
    
    return Object.entries(groupedContent).sort((a, b) => {
      const indexA = order.indexOf(a[0]) === -1 ? 999 : order.indexOf(a[0]);
      const indexB = order.indexOf(b[0]) === -1 ? 999 : order.indexOf(b[0]);
      return indexA - indexB;
    });
  };

  // Get display name for tab
  const getTabTitle = (tab) => {
    return tab === 'granted' ? 'Granted Patents' : 'Pre-grant Applications';
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await getRawData();
        const processedData = processData(rawData);
        setData(processedData);
        
        // Set all groups to expanded by default, except Content
        const initialExpandedState = {};
        Object.keys(processedData.granted).forEach(category => {
          initialExpandedState[category] = category !== "Content"; // Content starts collapsed
        });
        Object.keys(processedData.pregrant).forEach(category => {
          initialExpandedState[category] = category !== "Content"; // Content starts collapsed
        });
        setExpandedGroups(initialExpandedState);
        
        // Get available years and content types
        setAvailableYears(getAvailableYears(processedData));
        setFilteredYears(getAvailableYears(processedData));
        setAvailableContentTypes(getContentTypes(processedData));
      } catch (error) {
        console.error('Error loading patent data:', error);
      }
    };
    
    loadData();
  }, []);

  // Update filtered years when content type changes
  useEffect(() => {
    if (data) {
      const years = getYearsForContentType(data, activeTab, contentTypeFilter);
      setFilteredYears(years);
      
      // Reset year filter if current selection is not available in the filtered list
      if (yearFilter !== 'all' && !years.includes(yearFilter)) {
        setYearFilter('all');
      }
    }
  }, [contentTypeFilter, data, activeTab, yearFilter]);

  // Scroll to category when sidebar navigation is used
  useEffect(() => {
    if (scrolledToCategory) {
      document.getElementById(`group-${scrolledToCategory}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Highlight the category briefly
      const element = document.getElementById(`group-${scrolledToCategory}`);
      if (element) {
        element.style.backgroundColor = '#f0f9ff';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 1500);
      }
      
      // Reset the scrolled category
      setTimeout(() => {
        setScrolledToCategory(null);
      }, 100);
    }
  }, [scrolledToCategory]);

  // Filter the data based on the current filters
  const filterData = () => {
    if (!data) return {};

    const filtered = {};
    const currentTabData = data[activeTab];

    // Filter each category
    Object.keys(currentTabData).forEach(category => {
      // Check if this category has been organized into disambiguation groups
      if (currentTabData[category] && !Array.isArray(currentTabData[category])) {
        // Handle organized data structure with disambiguation groups
        const result = {
          disambiguated: [],
          raw: [],
          main: []
        };
        
        // Filter disambiguated items
        if (currentTabData[category].disambiguated) {
          result.disambiguated = currentTabData[category].disambiguated.filter(item => {
            const matchesSearch = 
              item.displayName.toLowerCase().includes(search.toLowerCase()) || 
              item.description.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
          });
        }
        
        // Filter raw items
        if (currentTabData[category].raw) {
          result.raw = currentTabData[category].raw.filter(item => {
            const matchesSearch = 
              item.displayName.toLowerCase().includes(search.toLowerCase()) || 
              item.description.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
          });
        }
        
        // Filter main items
        if (currentTabData[category].main) {
          result.main = currentTabData[category].main.filter(item => {
            const matchesSearch = 
              item.displayName.toLowerCase().includes(search.toLowerCase()) || 
              item.description.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
          });
        }
        
        filtered[category] = result;
      } else {
        // Handle regular array data structure
        filtered[category] = currentTabData[category].filter(item => {
          // Apply search filter
          const matchesSearch = 
            item.displayName.toLowerCase().includes(search.toLowerCase()) || 
            item.description.toLowerCase().includes(search.toLowerCase());
          
          // Apply year filter for Content category
          let matchesYear = true;
          if (yearFilter !== "all" && category === "Content") {
            matchesYear = item.year === yearFilter;
          }
          
          // Apply content type filter for Content category
          let matchesContentType = true;
          if (contentTypeFilter !== "all" && category === "Content") {
            matchesContentType = item.contentType === contentTypeFilter;
          }
          
          return matchesSearch && matchesYear && matchesContentType;
        });
      }
    });

    return filtered;
  };

  const filteredData = data ? filterData() : {};
  
  // Define the preferred category order
  const categoryOrder = [
    "Essentials", // Added Essentials category
    "General", 
    "People", 
    "Classification", 
    "Legal", 
    "Government", 
    "Geography", 
    "Other Documentation", 
    "Citations", 
    "Mapping", 
    "Other",
    "Content"  // Content at the end
  ];
  
  // Function to sort categories
  const sortCategories = (categories) => {
    return [...categories].sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.name);
      const bIndex = categoryOrder.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };
  
  // Calculate total files and create category count array
  const getTotalFiles = () => {
    if (!filteredData) return 0;
    
    return Object.keys(filteredData).reduce((sum, category) => {
      const categoryData = filteredData[category];
      if (Array.isArray(categoryData)) {
        return sum + categoryData.length;
      } else {
        // Count items in all sub-arrays if it's an object with disambiguated/raw structure
        let count = 0;
        if (categoryData.disambiguated) count += categoryData.disambiguated.length;
        if (categoryData.raw) count += categoryData.raw.length;
        if (categoryData.main) count += categoryData.main.length;
        return sum + count;
      }
    }, 0);
  };
  
  const getCategoriesWithCounts = () => {
    if (!filteredData) return [];
    
    return sortCategories(
      Object.keys(filteredData)
        .map(category => {
          const categoryData = filteredData[category];
          let count = 0;
          
          if (Array.isArray(categoryData)) {
            count = categoryData.length;
          } else {
            // Count items in all sub-arrays
            if (categoryData.disambiguated) count += categoryData.disambiguated.length;
            if (categoryData.raw) count += categoryData.raw.length;
            if (categoryData.main) count += categoryData.main.length;
          }
          
          return {
            name: category,
            count: count
          };
        })
        .filter(cat => cat.count > 0)
    );
  };
  
  const totalFiles = getTotalFiles();
  const categoriesWithCounts = getCategoriesWithCounts();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset year filter when switching tabs
    setYearFilter("all");
    setContentTypeFilter("all");
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleDownload = (link) => {
    window.open(link, '_blank');
  };

  const handleContentTypeChange = (type) => {
    setContentTypeFilter(type);
  };

  // Preserve abbreviation casing in display names
  const formatDisplayName = (name) => {
    // Common patent abbreviations to preserve casing
    const abbreviations = ['PCT', 'WIPO', 'CPC', 'IPC', 'USPC', 'US'];
    
    let displayName = name;
    abbreviations.forEach(abbr => {
      // Replace case-insensitive version with proper casing
      const regex = new RegExp(abbr, 'i');
      displayName = displayName.replace(regex, abbr);
    });
    
    return displayName;
  };

  // File Card Component
  const FileCard = ({ file, formatDisplayName, handleDownload, styles }) => {
    return (
      <div 
        style={styles.fileCard}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, styles.fileCardHover);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={styles.cardContent}>
          <div style={styles.fileNameRow}>
            <span style={styles.fileName}>{formatDisplayName(file.displayName)}</span>
          </div>
          
          {/* Show content type and year badges if available */}
          {(file.contentType || file.year) && (
            <div style={styles.fileMetaRow}>
              {file.contentType && (
                <span style={{...styles.fileMetaBadge, backgroundColor: '#e0f2fe', color: '#0369a1'}}>
                  {file.contentType}
                </span>
              )}
              {file.year && (
                <span style={{...styles.fileMetaBadge, backgroundColor: '#f0fdf4', color: '#166534'}}>
                  {file.year}
                </span>
              )}
            </div>
          )}
          
          <div style={styles.fileDescription}>
            {file.description}
          </div>
          <button 
            style={styles.downloadButton}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, styles.downloadButtonHover);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.downloadButton.backgroundColor;
            }}
            onClick={() => handleDownload(file.shareable_link)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
          </button>
        </div>
      </div>
    );
  };

  // Modern styling
  const styles = {
    container: {
      padding: '2rem',
      display: 'flex',
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      minHeight: '90vh',
    },
    mainContent: {
      flex: '1',
      marginLeft: sidebarOpen ? '240px' : '0',
      transition: 'margin-left 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      width: '100%',
      padding: '0 1rem',
    },
    sidebar: {
      width: '240px',
      backgroundColor: 'white',
      borderRight: '1px solid #e2e8f0',
      position: 'fixed',
      left: sidebarOpen ? '0' : '-240px',
      top: '0',
      bottom: '0',
      transition: 'left 0.3s ease',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem 0',
      boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)',
      overflow: 'auto',
    },
    sidebarHeader: {
      padding: '0 1rem 0.5rem 1rem',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '0.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sidebarTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#334155',
    },
    sidebarToggleButton: {
      position: 'fixed',
      left: sidebarOpen ? '240px' : '0',
      top: '1rem',
      width: '24px',
      height: '24px',
      backgroundColor: 'white',
      borderRadius: '0 4px 4px 0',
      border: '1px solid #e2e8f0',
      borderLeft: sidebarOpen ? '1px solid #e2e8f0' : 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      zIndex: '101',
      transition: 'left 0.3s ease',
      boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)',
    },
    sidebarCategoryLink: {
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#475569',
      transition: 'all 0.2s ease',
      fontSize: '0.9rem',
    },
    sidebarCategoryLinkActive: {
      backgroundColor: '#f1f5f9',
      color: '#2563eb',
      fontWeight: '500',
      borderRight: '3px solid #2563eb',
    },
    sidebarCategoryCount: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
      fontSize: '0.75rem',
      fontWeight: '500',
      padding: '0.15rem 0.5rem',
      borderRadius: '9999px',
    },
    header: {
      marginBottom: '1rem',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem',
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b',
      marginBottom: '1rem',
    },
    stats: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.9rem',
      color: '#64748b',
      marginBottom: '1rem',
    },
    statsBadge: {
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      fontWeight: '500',
      padding: '0.15rem 0.5rem',
      borderRadius: '9999px',
    },
    tabsContainer: {
      width: '100%',
      marginBottom: '1.5rem',
    },
    tabsList: {
      display: 'flex',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '1.5rem',
    },
    tabButton: {
      padding: '0.75rem 1.5rem',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      fontWeight: '500',
      color: '#64748b',
      transition: 'all 0.2s ease',
      marginRight: '1rem',
    },
    activeTab: {
      borderBottom: '2px solid #2563eb',
      color: '#2563eb',
      fontWeight: '600',
    },
    filtersContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    searchContainer: {
      position: 'relative',
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94a3b8',
    },
    searchInput: {
      width: '100%',
      padding: '0.75rem 1rem 0.75rem 2.5rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      backgroundColor: 'white',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease',
    },
    filterRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0',
      flexWrap: 'wrap',
    },
    filterLabel: {
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#334155',
      minWidth: '120px',
    },
    filterOptions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
    },
    filterOption: {
      padding: '0.25rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: '500',
      backgroundColor: '#e2e8f0',
      color: '#475569',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    filterOptionActive: {
      backgroundColor: '#2563eb',
      color: 'white',
    },
    selectDropdown: {
      padding: '0.4rem 0.6rem',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: '500',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      color: '#334155',
      cursor: 'pointer',
      minWidth: '150px',
    },
    categoriesContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginBottom: '1rem',
    },
    categoryTag: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: '500',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    categoryTagActive: {
      backgroundColor: '#2563eb',
      color: 'white',
    },
    categoryCount: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      padding: '0.1rem 0.4rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
    },
    groupContainer: {
      marginBottom: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    groupHeading: {
      padding: '1rem 1.25rem',
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      userSelect: 'none',
      backgroundColor: 'white',
      borderBottom: '1px solid #f1f5f9',
    },
    groupIcon: {
      transition: 'transform 0.2s ease',
    },
    groupIconExpanded: {
      transform: 'rotate(180deg)',
    },
    groupContent: {
      padding: '0.75rem',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '0.75rem',
      backgroundColor: '#f8fafc',
    },
    groupContentLarge: {
      gridTemplateColumns: '1fr 1fr',
    },
    contentFilters: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      padding: '0.75rem 1rem',
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #f1f5f9',
      marginBottom: '0.75rem',
    },
    fileCard: {
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      backgroundColor: 'white',
      transition: 'all 0.2s ease',
    },
    fileCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    cardContent: {
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    fileNameRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    fileName: {
      fontSize: '0.95rem',
      fontWeight: '500',
      color: '#334155',
    },
    fileMetaRow: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
    },
    fileMetaBadge: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
      fontSize: '0.75rem',
      fontWeight: '500',
      padding: '0.15rem 0.5rem',
      borderRadius: '9999px',
    },
    fileDescription: {
      fontSize: '0.85rem',
      color: '#64748b',
      lineHeight: '1.4',
      marginBottom: '0.5rem',
    },
    downloadButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      fontSize: '0.85rem',
      fontWeight: '500',
      padding: '0.35rem 0.85rem',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      alignSelf: 'flex-end',
      marginLeft: 'auto',
    },
    downloadButtonHover: {
      backgroundColor: '#1d4ed8',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem',
      color: '#64748b',
    },
    emptyState: {
      textAlign: 'center',
      padding: '2rem',
      color: '#64748b',
    },
    badge: {
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      fontSize: '0.75rem',
      fontWeight: '500',
      padding: '0.15rem 0.5rem',
      borderRadius: '9999px',
      marginLeft: '0.5rem',
    }
  };

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div>Loading patent data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sidebar Toggle Button */}
      <div 
        style={styles.sidebarToggleButton}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </div>
      
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>Categories</div>
        </div>
        
        {categoriesWithCounts.map(category => (
          <div 
            key={category.name}
            style={{
              ...styles.sidebarCategoryLink,
              ...(expandedGroups[category.name] ? styles.sidebarCategoryLinkActive : {})
            }}
            onClick={() => {
              setScrolledToCategory(category.name);
              setExpandedGroups(prev => ({...prev, [category.name]: true}));
            }}
          >
            <span>{category.name}</span>
            <span style={styles.sidebarCategoryCount}>{category.count}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>PatentsView Data Download</h1>
          <p style={styles.subtitle}>Access and download patent datasets for research and analysis</p>
          
          <div style={styles.stats}>
            <span>Currently viewing:</span>
            <span style={styles.statsBadge}>{getTabTitle(activeTab)}</span>
            <span>•</span>
            <span>{totalFiles} datasets available</span>
          </div>
        </div>

        <div style={styles.tabsContainer}>
          <div style={styles.tabsList}>
            <div 
              style={{
                ...styles.tabButton,
                ...(activeTab === "granted" ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange("granted")}
            >
              Granted Patents
            </div>
            <div 
              style={{
                ...styles.tabButton,
                ...(activeTab === "pregrant" ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange("pregrant")}
            >
              Pre-grant Applications
            </div>
          </div>
        </div>

        <div style={styles.filtersContainer}>
          <div style={styles.searchContainer}>
            <div style={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              style={styles.searchInput}
              placeholder="Search datasets by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category quick navigation */}
        <div style={styles.categoriesContainer}>
          {categoriesWithCounts.map(category => (
            <div 
              key={category.name}
              style={styles.categoryTag}
              onClick={() => {
                // Expand this group and scroll to it
                setExpandedGroups(prev => ({...prev, [category.name]: true}));
                setScrolledToCategory(category.name);
              }}
            >
              {category.name}
              <span style={styles.categoryCount}>{category.count}</span>
            </div>
          ))}
        </div>

        {categoriesWithCounts.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 1rem'}}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>No datasets found matching your search criteria.</p>
          </div>
        )}

        {categoriesWithCounts.map(category => {
          const isExpanded = expandedGroups[category.name] === true;
          const files = filteredData[category.name];
          const showContentFilters = category.name === "Content" && isExpanded;
          
          return (
            <div key={category.name} style={styles.groupContainer} id={`group-${category.name}`}>
              <div 
                style={styles.groupHeading}
                onClick={() => toggleGroup(category.name)}
              >
                <div style={{display: 'flex', alignItems: 'center'}}>
                  {category.name} 
                  <span style={styles.badge}>{category.count}</span>
                </div>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    ...styles.groupIcon,
                    ...(isExpanded ? styles.groupIconExpanded : {})
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              
              {isExpanded && (
                <>
                  {showContentFilters && (
                    <div style={styles.contentFilters}>
                      {/* Content type filter */}
                      {availableContentTypes.length > 0 && (
                        <div style={styles.filterRow}>
                          <div style={styles.filterLabel}>Content Type:</div>
                          <div style={styles.filterOptions}>
                            <div 
                              style={{
                                ...styles.filterOption,
                                ...(contentTypeFilter === "all" ? {
                                  backgroundColor: '#2563eb',
                                  color: 'white'
                                } : {
                                  backgroundColor: '#f1f5f9',
                                  color: '#64748b',
                                  border: '1px solid #e2e8f0'
                                })
                              }}
                              onClick={() => handleContentTypeChange("all")}
                            >
                              All Types
                            </div>
                            {availableContentTypes.map(type => (
                              <div 
                                key={type}
                                style={{
                                  ...styles.filterOption,
                                  ...(contentTypeFilter === type ? {
                                    backgroundColor: contentTypeColors[type]?.header || contentTypeColors['Other'].header,
                                    color: 'white'
                                  } : {
                                    backgroundColor: contentTypeColors[type]?.bg || contentTypeColors['Other'].bg,
                                    color: contentTypeColors[type]?.header || contentTypeColors['Other'].header,
                                    border: `1px solid ${contentTypeColors[type]?.border || contentTypeColors['Other'].border}`
                                  })
                                }}
                                onClick={() => handleContentTypeChange(type)}
                              >
                                {type}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Year filter dropdown */}
                      {filteredYears.length > 0 && (
                        <div style={styles.filterRow}>
                          <div style={styles.filterLabel}>Year:</div>
                          <select 
                            style={styles.selectDropdown}
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                          >
                            <option value="all">All Years</option>
                            {filteredYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{
                    ...styles.groupContent,
                    ...(Array.isArray(files) && files.length > 3 && contentTypeFilter !== "all" ? styles.groupContentLarge : {})
                  }}>
                    {/* Render files for categories with disambiguation groups */}
                    {!Array.isArray(files) && (category.name === "People" || category.name === "Geography") && (
                      <div style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem"
                      }}>
                        {/* Column headers */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "150px 1fr 1fr",
                          padding: "0.5rem 0",
                          borderBottom: "2px solid #e2e8f0",
                          fontWeight: "600",
                          color: "#334155"
                        }}>
                          <div>Type</div>
                          <div>Disambiguated (Processed)</div>
                          <div>Not Disambiguated (Raw)</div>
                        </div>
                        
                        {/* Matched pairs in grid rows */}
                        {createMatchedPairs(
                          files.disambiguated || [], 
                          files.raw || [],
                          files.main || []
                        ).map(({ personType, disambiguated, raw, main }) => (
                          <div key={personType} style={{
                            display: "grid",
                            gridTemplateColumns: "150px 1fr 1fr",
                            gap: "0.75rem",
                            padding: "0.75rem 0",
                            borderBottom: "1px solid #f1f5f9"
                          }}>
                            {/* Person type label */}
                            <div style={{
                              fontWeight: "600",
                              color: "#334155",
                              padding: "0.5rem 0"
                            }}>
                              {personType}
                            </div>
                            
                            {/* Disambiguated files column */}
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem"
                            }}>
                              {disambiguated.map((file) => (
                                <FileCard 
                                  key={file.table_name} 
                                  file={file} 
                                  formatDisplayName={formatDisplayName}
                                  handleDownload={handleDownload}
                                  styles={styles}
                                />
                              ))}
                              {disambiguated.length === 0 && (
                                <div style={{
                                  padding: "1rem",
                                  backgroundColor: "#f8fafc",
                                  borderRadius: "6px",
                                  color: "#94a3b8",
                                  fontSize: "0.85rem",
                                  textAlign: "center",
                                  border: "1px dashed #e2e8f0"
                                }}>
                                  No disambiguated files
                                </div>
                              )}
                            </div>
                            
                            {/* Raw files column */}
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem"
                            }}>
                              {raw.map((file) => (
                                <FileCard 
                                  key={file.table_name} 
                                  file={file} 
                                  formatDisplayName={formatDisplayName}
                                  handleDownload={handleDownload}
                                  styles={styles}
                                />
                              ))}
                              {raw.length === 0 && (
                                <div style={{
                                  padding: "1rem",
                                  backgroundColor: "#f8fafc",
                                  borderRadius: "6px",
                                  color: "#94a3b8",
                                  fontSize: "0.85rem",
                                  textAlign: "center",
                                  border: "1px dashed #e2e8f0"
                                }}>
                                  No raw files
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Other files that don't fit the paired structure (full width) */}
                        {files.main && files.main.filter(file => {
                          const personType = getPersonType(file.table_name);
                          return personType === 'Other';
                        }).length > 0 && (
                          <div style={{marginTop: "1rem"}}>
                            <h3 style={{
                              fontSize: "1rem", 
                              fontWeight: "600", 
                              color: "#334155", 
                              padding: "0.5rem",
                              borderBottom: "1px solid #e2e8f0",
                              marginBottom: "0.75rem"
                            }}>
                              Other Files
                            </h3>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "0.75rem"
                            }}>
                              {files.main.filter(file => {
                                const personType = getPersonType(file.table_name);
                                return personType === 'Other';
                              }).map((file) => (
                                <FileCard 
                                  key={file.table_name} 
                                  file={file} 
                                  formatDisplayName={formatDisplayName}
                                  handleDownload={handleDownload}
                                  styles={styles}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Render content category with color-coded groups */}
                    {Array.isArray(files) && category.name === "Content" && contentTypeFilter === "all" && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "1.5rem",
                        width: "100%",
                        gridColumn: "1/-1"
                      }}>
                        {sortContentTypes(groupContentByType(files)).map(([contentType, contentItems]) => {
                          // Get color scheme for this content type
                          const colors = contentTypeColors[contentType] || contentTypeColors['Other'];
                          
                          return (
                            <div key={contentType} style={{
                              width: "100%",
                              backgroundColor: colors.bg, 
                              borderRadius: "8px",
                              border: `1px solid ${colors.border}`,
                              overflow: "hidden"
                            }}>
                              <h3 style={{
                                fontSize: "1.1rem", 
                                fontWeight: "600", 
                                color: "white", 
                                padding: "0.75rem 1rem",
                                backgroundColor: colors.header,
                                borderBottom: `1px solid ${colors.border}`,
                                margin: 0,
                                display: "flex",
                                alignItems: "center"
                              }}>
                                {contentType}
                                <span style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                                  color: "white",
                                  fontWeight: "500",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "9999px",
                                  marginLeft: "0.5rem",
                                  fontSize: "0.75rem"
                                }}>
                                  {contentItems.length}
                                </span>
                              </h3>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: contentItems.length > 1 ? "1fr 1fr" : "1fr",
                                gap: "0.75rem",
                                padding: "0.75rem"
                              }}>
                                {contentItems.map((file) => (
                                  <FileCard 
                                    key={file.table_name} 
                                    file={file} 
                                    formatDisplayName={formatDisplayName}
                                    handleDownload={handleDownload}
                                    styles={styles}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Render regular file arrays for non-Content categories or when Content Type filter is active */}
                    {Array.isArray(files) && (category.name !== "Content" || contentTypeFilter !== "all") && (
                      files.map((file) => (
                        <FileCard 
                          key={file.table_name} 
                          file={file} 
                          formatDisplayName={formatDisplayName}
                          handleDownload={handleDownload}
                          styles={styles}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatentDownloadInterface;