"""Pin a test page's clock to a weekday morning in Springfield (2026-10-07, the Hub's time-of-day test fix).
Several browser tests build their examples relative to "now" (due in 2 hours, a shift at 4pm, today's date), so late in
the evening or overnight those examples fall into tomorrow and the tests fail with nothing wrong in the Hub. Pinning the
page's clock to Wednesday 7 October 2026, 10:00am Chicago time makes them give the same answer at any hour. The clock
still moves forward from there, so timers and "a moment later" checks behave as usual."""
PIN = '2026-10-07T10:00:00-05:00'


def pin(page, at=PIN):
    page.clock.install(time=at)
    page.clock.resume()
    return page
