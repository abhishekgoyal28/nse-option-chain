# NSE Option Chain Tracker - TypeScript Edition

A completely refactored, production-ready TypeScript version of the NSE Option Chain Tracker with improved architecture, type safety, and maintainability.

## 🚀 What's New in v3.0.0

### Architecture Improvements
- **Full TypeScript**: Complete rewrite with strict TypeScript configuration
- **Layered Architecture**: Organized into controllers, services, middleware, and utilities
- **Dependency Injection**: Proper service initialization and dependency management
- **Error Handling**: Comprehensive error handling with custom error types
- **Logging**: Structured logging with Winston
- **Validation**: Input validation with Joi schemas
- **Testing**: Jest setup with example tests

### Code Organization
```
src/
├── types/           # TypeScript type definitions
├── config/          # Configuration management
├── services/        # Business logic services
├── controllers/     # HTTP request handlers
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── routes/          # API route definitions
└── server.ts        # Main server file
```

### Key Features
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Modular Services**: Separate services for Kite, Data Storage, Analysis, etc.
- **Enhanced Security**: Helmet, CORS, rate limiting, input validation
- **Better Error Handling**: Custom error types and centralized error handling
- **Improved Logging**: Structured logging with different levels
- **Testing Ready**: Jest configuration with example tests
- **Development Tools**: ESLint, Prettier, hot reload with ts-node-dev

## 📦 Installation

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Variables
```env
# Required
KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret

# Optional
NODE_ENV=development
PORT=3000

# Google Sheets (Optional)
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
```

## 🛠️ Development

### Available Scripts
```bash
# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Clean build directory
npm run clean
```

### Development Workflow
1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Make Changes**: Edit files in `src/` directory

3. **Run Tests**:
   ```bash
   npm test
   ```

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

## 🏗️ Architecture

### Services Layer
- **KiteService**: Handles Kite Connect API interactions
- **DataService**: Coordinates data storage between Excel and Google Sheets
- **ExcelStorageService**: Manages local Excel file storage
- **GoogleSheetsService**: Handles Google Sheets integration
- **AnalysisService**: Performs market analysis and signal generation
- **PeriodicFetchService**: Manages background data fetching

### Controllers Layer
- **HealthController**: System health and status endpoints
- **AuthController**: Kite Connect authentication
- **DataController**: Data fetching and historical data management
- **AnalysisController**: Market analysis and signal endpoints
- **GoogleSheetsController**: Google Sheets specific endpoints

### Middleware
- **Security**: Helmet, CORS, rate limiting, compression
- **Error Handling**: Centralized error handling and logging
- **Validation**: Request validation with Joi schemas

### Utilities
- **Market Utils**: Market hours, status checking
- **Calculations**: Financial calculations, technical indicators
- **Validators**: Input validation schemas and helpers
- **Logger**: Structured logging configuration

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - System health check
- `GET /api/health/version` - Version information

### Authentication
- `GET /api/auth/login-url` - Get Kite login URL
- `POST /api/auth/generate-token` - Generate access token
- `POST /api/auth/set-token` - Set access token

### Data Management
- `GET /api/data/nifty` - Current NIFTY option chain
- `POST /api/data/fetch` - Manual data fetch
- `POST /api/data/control-fetch` - Control periodic fetch
- `GET /api/data/historical` - Historical data with filters
- `GET /api/data/historical/summary` - Historical data statistics
- `DELETE /api/data/historical` - Clear historical data
- `GET /api/data/export` - Export historical data

### Analysis
- `GET /api/analysis/market` - Market analysis
- `GET /api/analysis/signals` - Trading signals
- `GET /api/analysis/export/:format` - Export data in various formats
- `GET /api/analysis/ws-info` - WebSocket information

### Google Sheets
- `GET /api/sheets/status` - Google Sheets status
- `GET /api/sheets/historical-data` - Historical data from sheets
- `GET /api/sheets/daily-summary` - Daily summary from sheets

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
```
src/__tests__/
├── utils/
│   └── calculations.test.ts
├── services/
│   └── DataService.test.ts
└── controllers/
    └── HealthController.test.ts
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Production Environment
```bash
NODE_ENV=production npm start
```

### Docker Support
The existing Dockerfile should work with the new structure after building:
```bash
npm run build
docker build -t nse-tracker .
```

## 🔧 Configuration

### TypeScript Configuration
- Strict type checking enabled
- Path mapping for clean imports (`@/` prefix)
- Source maps for debugging
- Declaration files generation

### ESLint Configuration
- TypeScript ESLint rules
- Strict linting for code quality
- Auto-fixable rules

### Jest Configuration
- TypeScript support with ts-jest
- Path mapping support
- Coverage reporting

## 📈 Performance Improvements

### Type Safety
- Compile-time error detection
- Better IDE support and autocomplete
- Reduced runtime errors

### Code Organization
- Modular architecture for better maintainability
- Separation of concerns
- Easier testing and debugging

### Error Handling
- Centralized error handling
- Custom error types
- Better error reporting

## 🔄 Migration from v2.x

### Key Changes
1. **File Structure**: Complete reorganization into layered architecture
2. **TypeScript**: All JavaScript files converted to TypeScript
3. **Imports**: Path mapping with `@/` prefix
4. **Error Handling**: New error handling system
5. **Validation**: Joi-based input validation
6. **Logging**: Winston-based structured logging

### Migration Steps
1. Install new dependencies: `npm install`
2. Update environment variables (same as before)
3. Build the project: `npm run build`
4. Start the server: `npm start`

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a feature branch
5. Make changes with tests
6. Run linting: `npm run lint:fix`
7. Run tests: `npm test`
8. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use ESLint configuration
- Write tests for new features
- Document complex functions

## 📝 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using TypeScript, Express.js, and modern development practices.**
