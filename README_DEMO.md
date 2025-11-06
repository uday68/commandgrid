# 📊 Project Management Tool - Data Visualization Demo

A comprehensive project management system with advanced data visualization capabilities and AI-powered insights.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python (3.8 or higher)
- PostgreSQL (running on port 5433)
- Redis (optional, for full AI features)

### Setup Demo
Run the setup script from the project root:

**Windows:**
```bash
setup_demo.bat
```

**Linux/Mac:**
```bash
chmod +x setup_demo.sh
./setup_demo.sh
```

### Start the Application

1. **Start AI Backend** (Terminal 1):
```bash
cd ai_backend
python start_ai_backend.py
```

2. **Start Node.js Backend** (Terminal 2):
```bash
cd backend
npm run dev
```

3. **Start React Frontend** (Terminal 3):
```bash
cd pmt
npm start
```

## 📊 Data Visualization Features

### Sample Datasets Included
1. **Project Management Data** - Budget, progress, team metrics
2. **Monthly Metrics** - Time series performance data
3. **Employee Performance** - Individual and department analytics
4. **Issue Tracking** - Bug reports and resolution times  
5. **Financial Data** - Quarterly performance metrics

### Visualization Types
- 📈 **Line Charts** - Trends and time series
- 📊 **Bar Charts** - Comparisons and distributions
- 🥧 **Pie Charts** - Categorical data breakdown
- 📍 **Scatter Plots** - Correlation analysis
- 🌊 **Area Charts** - Cumulative data
- 🔥 **Heatmaps** - Pattern visualization

### AI-Powered Features
- 🤖 **Real-time Analysis** - Automatic data insights
- 💬 **Chat Assistant** - Natural language queries
- 🧠 **Smart Recommendations** - Optimal chart suggestions
- 🔮 **Predictive Analytics** - Trend detection and forecasting

## 🎮 How to Use the Demo

### 1. Access the Data Visualization
- Navigate to Admin Dashboard
- Click "Data Visualization" in the tools panel
- Or visit the enhanced demo modal

### 2. Load Sample Data
- Download one of the provided sample datasets
- Drag and drop the CSV file into the visualizer
- Watch as AI automatically analyzes your data

### 3. Explore Visualizations
- Choose from different chart types
- Configure X and Y axes
- Customize colors and styling
- Export your visualizations

### 4. Chat with AI Assistant
- Click the chat icon to open AI assistant
- Ask questions like:
  - "What patterns do you see in this data?"
  - "Which chart type would work best?"
  - "Show me correlations between columns"
  - "Identify any outliers or anomalies"

### 5. Advanced Features
- **Real-time Insights** - Get instant analysis
- **Interactive Filtering** - Drill down into data
- **Export Options** - Save charts as images/PDFs
- **Data Grid View** - Tabular data exploration

## 🔧 API Endpoints

### AI Backend (Port 8000)
- `GET /health/ai` - AI service health check
- `POST /ai/query` - Process AI queries
- `WebSocket /ws/ai_assistant` - Real-time AI chat
- `GET /api/ai/recommendations` - Get AI recommendations

### Node.js Backend (Port 5000)
- `GET /api/analytics/*` - Analytics data
- `POST /api/chat-proxy/*` - AI chat proxy
- `GET /api/security/*` - Security metrics
- `GET /api/projects` - Project data

### Frontend (Port 3000)
- `/admin` - Admin dashboard with tools
- `/data-visualization-demo` - Standalone demo page
- `/` - Main application

## 🎯 Demo Scenarios

### Scenario 1: Project Budget Analysis
1. Load "Project Management Data"
2. Create bar chart: Budget vs Actual Cost
3. Ask AI: "Which projects are over budget?"
4. Use scatter plot: Team Size vs Progress

### Scenario 2: Performance Trends
1. Load "Monthly Metrics" 
2. Create line chart: Revenue over time
3. Ask AI: "What's the growth trend?"
4. Add area chart for cumulative metrics

### Scenario 3: Employee Analytics
1. Load "Employee Performance"
2. Create scatter plot: Hours vs Productivity
3. Ask AI: "Who are the top performers?"
4. Group by department for comparisons

### Scenario 4: Issue Resolution Analysis
1. Load "Issue Tracking"
2. Create pie chart: Issue types distribution
3. Ask AI: "What are resolution time patterns?"
4. Bar chart: Resolution time by severity

### Scenario 5: Financial Dashboard
1. Load "Financial Data"
2. Create line chart: Revenue and profit trends
3. Ask AI: "Predict next quarter performance"
4. Area chart: Market share growth

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18** - UI framework
- **Material-UI** - Component library
- **Recharts** - Visualization library
- **Framer Motion** - Animations
- **Axios** - HTTP client

### Backend Stack
- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication

### AI Backend Stack
- **FastAPI** - Python web framework
- **OpenRouter** - AI model API
- **Redis** - Caching and sessions
- **AsyncPG** - Database connector
- **WebSockets** - Real-time communication

## 📁 Project Structure

```
d:\project_management_tool\
├── ai_backend/           # Python AI services
│   ├── api/             # FastAPI application
│   ├── middleware/      # AI processing components
│   └── start_ai_backend.py
├── backend/             # Node.js backend
│   ├── src/            # Express application
│   └── package.json
├── pmt/                # React frontend
│   ├── src/            # React components
│   ├── public/         # Static assets
│   └── package.json
├── sample_datasets/    # Demo data files
│   ├── project_data.csv
│   ├── monthly_metrics.csv
│   ├── employee_performance.csv
│   ├── issues_tracking.csv
│   └── financial_data.csv
├── setup_demo.bat     # Windows setup script
├── setup_demo.sh      # Linux/Mac setup script
└── README_DEMO.md     # This file
```

## 🔍 Troubleshooting

### AI Backend Not Working
- Check if Python dependencies are installed
- Verify AI backend is running on port 8000
- Check OpenRouter API key configuration

### Data Not Loading
- Ensure CSV files are in correct format
- Check file permissions
- Verify sample datasets are in public folder

### Visualization Not Rendering
- Check browser console for errors
- Ensure chart libraries are loaded
- Verify data format compatibility

### Chat Assistant Offline
- Check WebSocket connection
- Verify AI backend health endpoint
- Ensure authentication token is valid

## 🌟 Key Features Demonstrated

### 1. **Robust Data Processing**
- Multiple file format support (CSV, Excel)
- Automatic data type detection
- Data cleaning and validation
- Error handling and fallbacks

### 2. **AI Integration**
- Natural language processing
- Intelligent recommendations
- Pattern recognition
- Predictive analytics

### 3. **Interactive Visualizations**
- Multiple chart types
- Real-time updates
- Customizable styling
- Export capabilities

### 4. **User Experience**
- Intuitive drag-and-drop interface
- Responsive design
- Dark/light theme support
- Accessibility features

### 5. **Enterprise Features**
- Role-based access control
- Audit logging
- Security scanning
- Performance monitoring

## 🎉 Success Metrics

After running the demo, you should be able to:
- ✅ Load and visualize any CSV dataset
- ✅ Chat with AI about your data
- ✅ Generate multiple chart types
- ✅ Export visualizations
- ✅ Get intelligent recommendations
- ✅ See real-time data analysis

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all services are running
3. Check browser console for errors
4. Ensure sample data is accessible

---

**Happy Visualizing! 📊✨**
