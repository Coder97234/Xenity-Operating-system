const DAYS = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday']

const forecast = [
  { icon: '☀', high: 21, low: 12 },
  { icon: '⛅', high: 19, low: 11 },
  { icon: '☁', high: 17, low: 10 },
  { icon: '🌦', high: 16, low: 10 },
  { icon: '☀', high: 20, low: 12 },
]

export default function Weather() {
  const hours = ['Now', '11', '12', '13', '14', '15', '16', '17']

  return (
    <div className="weather">
      <header className="weather-head">
        <small>Xenity City</small>
        <h1>18°</h1>
        <p>Partly cloudy</p>
        <span>H:21°  L:12°</span>
      </header>

      <section className="weather-hours">
        {hours.map((hour, i) => (
          <div key={hour} className="weather-hour">
            <span>{hour}</span>
            <span className="w-icon">{i === 0 ? '⛅' : i % 3 === 0 ? '☁' : '☀'}</span>
            <strong>{18 + (i % 4)}°</strong>
          </div>
        ))}
      </section>

      <section className="weather-days">
        {forecast.map((day, i) => (
          <div key={DAYS[i]} className="weather-day">
            <span>{DAYS[i]}</span>
            <span className="w-icon">{day.icon}</span>
            <span className="w-range">
              <strong>{day.high}°</strong> {day.low}°
            </span>
          </div>
        ))}
      </section>

      <p className="fine-print">Offline forecast data — Weather runs entirely inside Xenity.</p>
    </div>
  )
}
