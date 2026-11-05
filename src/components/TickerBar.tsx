const MESSAGE = 'You are in the best droptaxi. Book and save your money';

/** Slim scrolling message under the header. The text is repeated so the loop has no gap; the copies are hidden from screen readers. */
export function TickerBar() {
  const items = Array.from({ length: 8 });
  return (
    <div className="ticker" role="region" aria-label="Announcement">
      <p className="ticker-static">{MESSAGE}</p>
      <div className="ticker-track" aria-hidden="true">
        {items.map((_, i) => (
          <span className="ticker-item" key={i}><b>★</b> {MESSAGE}</span>
        ))}
      </div>
    </div>
  );
}
