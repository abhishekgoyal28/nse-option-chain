# Periodic Data Fetch Implementation

## Overview

The server has been updated to implement periodic background data fetching instead of fetching data only when clients request it. This ensures continuous data collection during market hours and provides clients with the latest available data.

## Key Changes

### 1. Background Data Fetching
- **Automatic**: Server automatically fetches NIFTY option chain data every 30 seconds during market hours
- **Market-aware**: Only runs during market hours (9:30 AM - 3:30 PM IST, Mon-Fri)
- **Smart monitoring**: Automatically starts/stops based on market hours

### 2. Updated API Behavior

#### `/api/nifty-data` (GET)
**Before**: Fetched fresh data from Kite API on every request
**Now**: Serves the latest data from memory or historical file

Response includes:
- `source`: "memory" (latest data) or "historical_file" (from saved data)
- `last_updated`: Timestamp of when data was last fetched
- `market_status`: Current market status and explanation

#### New Endpoints

##### `/api/fetch-data` (POST)
Manually trigger an immediate data fetch
```bash
curl -X POST http://localhost:3000/api/fetch-data
```

##### `/api/control-fetch` (POST)
Control the periodic fetch process
```bash
# Start periodic fetch
curl -X POST http://localhost:3000/api/control-fetch \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Stop periodic fetch
curl -X POST http://localhost:3000/api/control-fetch \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

# Check status
curl -X POST http://localhost:3000/api/control-fetch \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### 3. Enhanced Health Check

The `/api/health` endpoint now includes periodic fetch information:
```json
{
  "status": "healthy",
  "periodic_fetch": {
    "status": "running",
    "interval": "30 seconds",
    "last_data_timestamp": "2025-01-15T10:30:00.000Z",
    "market_open": true
  }
}
```

## Benefits

1. **Continuous Data Collection**: Data is collected every 30 seconds during market hours
2. **Faster Client Response**: Clients get immediate responses from cached data
3. **Reduced API Load**: Multiple clients don't trigger multiple API calls
4. **Market-aware**: Automatically handles market hours and weekends
5. **Graceful Degradation**: Falls back to historical data if live data unavailable

## Data Flow

```
Market Hours:
Server Start → Check Market Hours → Start Periodic Fetch (30s) → Save to Excel → Serve to Clients

Market Closed:
Server Start → Check Market Hours → Wait for Market Open → Monitor Every Minute

Client Request:
Client → /api/nifty-data → Serve from Memory/File → Response
```

## Configuration

### Environment Variables
- `KITE_API_KEY`: Your Kite API key
- `KITE_API_SECRET`: Your Kite API secret
- `PORT`: Server port (default: 3000)

### Market Hours
- **Trading Hours**: 9:30 AM - 3:30 PM IST
- **Trading Days**: Monday - Friday
- **Timezone**: Asia/Kolkata (IST)

## Testing

Run the test script to verify functionality:
```bash
node test_periodic_fetch.js
```

## Monitoring

### Server Logs
The server provides detailed logging:
- `🔄 Periodic data update`: Every successful fetch
- `🟢 Market opened`: When periodic fetch starts
- `🔴 Market closed`: When periodic fetch stops
- `💾 Historical data saved`: When data is saved to Excel

### API Monitoring
- Check `/api/health` for overall status
- Use `/api/control-fetch` with `"action": "status"` for fetch status
- Monitor `/api/historical-summary` for data collection stats

## Error Handling

1. **KiteConnect Issues**: Server continues with last known data
2. **Market Closed**: Automatic stop/start based on hours
3. **Network Issues**: Retries on next interval
4. **Authentication**: Manual intervention required for token refresh

## Graceful Shutdown

The server handles shutdown signals properly:
- `SIGINT` (Ctrl+C): Stops periodic fetch and exits
- `SIGTERM`: Stops periodic fetch and exits

## File Structure

```
data/
├── nifty_history.xlsx          # Historical data storage
└── (other data files)

server.js                       # Main server with periodic fetch
test_periodic_fetch.js         # Test script
PERIODIC_FETCH_README.md       # This documentation
```

## Migration Notes

### For Existing Clients
- **No breaking changes**: `/api/nifty-data` still works the same way
- **Faster responses**: Data is now served from cache
- **Better reliability**: Fallback to historical data if needed

### For New Implementations
- Use `/api/nifty-data` for current data (recommended)
- Use `/api/historical-data` for time-series analysis
- Monitor `/api/health` for system status
- Use control endpoints for management

## Troubleshooting

### Common Issues

1. **"No data available"**
   - Check KiteConnect authentication
   - Verify market hours
   - Try manual fetch: `POST /api/fetch-data`

2. **Periodic fetch not starting**
   - Check market hours
   - Manually start: `POST /api/control-fetch {"action": "start"}`
   - Check server logs for errors

3. **Old data being served**
   - Check if periodic fetch is running: `/api/health`
   - Check last update timestamp in response
   - Try manual fetch to update immediately

### Debug Commands

```bash
# Check server status
curl http://localhost:3000/api/health

# Check fetch status
curl -X POST http://localhost:3000/api/control-fetch \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Force data update
curl -X POST http://localhost:3000/api/fetch-data

# Get current data with metadata
curl http://localhost:3000/api/nifty-data
```

## Performance

- **Memory Usage**: Minimal (stores only latest data in memory)
- **Disk Usage**: Excel file grows over time (managed with 2000 record limit)
- **Network**: One API call every 30 seconds during market hours
- **Response Time**: Near-instant (served from memory/file)

## Future Enhancements

1. **WebSocket Support**: Real-time data streaming
2. **Multiple Instruments**: Support for other indices
3. **Configurable Intervals**: User-defined fetch intervals
4. **Data Compression**: Optimize historical data storage
5. **Alerting**: Email/SMS alerts for significant changes
