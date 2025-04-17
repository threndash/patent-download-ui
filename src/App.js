import { useState } from 'react';

const PatentDownloadInterface = () => {
  const [activeTab, setActiveTab] = useState("granted");
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  const categories = {
    granted: {
      title: "Granted Patents",
      groups: {
        People: [
          "Disambiguated Assignee Data",
          "Raw Assignee Data",
          "Disambiguated Inventor Data",
          "Raw Inventor Data"
        ],
        Classification: [
          "CPC Classification at Issue",
          "Current CPC Classifications",
          "USPC Classification"
        ],
        Content: [
          "Abstracts",
          "Claims",
          "Brief Summary"
        ]
      }
    },
    pregrant: {
      title: "Pre-grant Applications",
      groups: {
        People: [
          "Disambiguated Assignee Info",
          "Raw Assignee Info"
        ],
        Classification: [
          "CPC at Submission",
          "Current CPC"
        ],
        Content: [
          "Application Abstracts",
          "Published Application Data"
        ]
      }
    }
  };

  const tabData = categories[activeTab];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Modern styling
  const styles = {
    container: {
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    header: {
      marginBottom: '1.5rem',
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
      marginBottom: '1.5rem',
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
    searchContainer: {
      position: 'relative',
      marginBottom: '1.5rem',
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
      padding: '0.5rem',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.75rem',
      backgroundColor: '#f8fafc',
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
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fileName: {
      fontSize: '0.95rem',
      fontWeight: '500',
      color: '#334155',
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
    },
    downloadButtonHover: {
      backgroundColor: '#1d4ed8',
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>PatentsView Data Download</h1>
        <p style={styles.subtitle}>Access and download patent datasets for research and analysis</p>
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

      <div style={styles.searchContainer}>
        <div style={styles.searchIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          style={styles.searchInput}
          placeholder="Search datasets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {Object.entries(tabData.groups).map(([groupName, files]) => {
        const filteredFiles = files.filter((file) =>
          file.toLowerCase().includes(search.toLowerCase())
        );
        if (filteredFiles.length === 0) return null;
        
        const isExpanded = expandedGroups[groupName] !== false; // Default to expanded

        return (
          <div key={groupName} style={styles.groupContainer}>
            <div 
              style={styles.groupHeading}
              onClick={() => toggleGroup(groupName)}
            >
              <div style={{display: 'flex', alignItems: 'center'}}>
                {groupName} 
                <span style={styles.badge}>{filteredFiles.length}</span>
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
              <div style={styles.groupContent}>
                {filteredFiles.map((file) => (
                  <div 
                    key={file} 
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
                      <span style={styles.fileName}>{file}</span>
                      <button 
                        style={styles.downloadButton}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, styles.downloadButtonHover);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = styles.downloadButton.backgroundColor;
                        }}
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
                ))}
              </div>
            )}
          </div>
        );
      })}

      {Object.entries(tabData.groups).every(
        ([_, files]) => files.filter(file => file.toLowerCase().includes(search.toLowerCase())).length === 0
      ) && (
        <div style={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 1rem'}}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No datasets found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default PatentDownloadInterface;