$(document).ready(function () {
  const table = $("#player_table").DataTable({
    ajax: {
      url: "../api/get_players.php",
      dataSrc: "data"
    },
    columns: [
      { data: "pdga_number" },
      {
        data: "full_name",
        render: function (data, type, row) {
          return `<a target="_blank" href="./../index.php?pdga_number=${row.pdga_number}">${data}</a>`;
        },
      },
      { data: "division" },
      { data: "city" },
      { data: "state" },
      { data: "country" },
      { data: "nationality" },
      { data: "member_since" },
    ],
    pageLength: 25
  });
});

window.addEventListener("DOMContentLoaded", () => {
  // Chart 1: Score Chart
  const select = document.getElementById("ratingPlayerSelect");
  const ctx = document.getElementById("topRatedTrendChart");
  let chartInstance = null;

  fetch("../api/fetch_players_with_rating.php")
    .then(res => res.json())
    .then(players => {
      players.forEach(p => {
        const option = document.createElement("option");
        option.value = p.pdga_number;
        option.textContent = p.player_name;
        select.appendChild(option);
      });
    });

  select.addEventListener("change", () => {
    const pdgaNumber = select.value;
    if (!pdgaNumber) return;

    fetch("../api/fetch_single_player_rating.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdga_number: pdgaNumber })
    })
      .then(res => res.json())
      .then(data => {
        const points = data.map(item => ({
          x: new Date(item.start_date),
          y: parseFloat(item.event_rating)
        }));

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            datasets: [{
              label: data[0]?.player_name || "Player",
              data: points,
              borderColor: 'blue',
              borderWidth: 2,
              tension: 0.3,
              fill: false
            }]
          },
          options: {
            responsive: true,
            scales: {
              x: {
                type: 'time',
                time: { unit: 'week' },
                title: { display: true, text: 'Event Date' }
              },
              y: {
                title: { display: true, text: 'Event Rating' }
              }
            },
            plugins: {
              title: { display: true, text: 'Rating Trend' },
              legend: { position: 'bottom' }
            }
          }
        });
      });
  });

  // Chart 2: Longest Throw
  const longestCtx = document.getElementById('longestThrowChart');
  fetch('../api/fetch_longest_throws.php')
    .then(res => res.json())
    .then(data => {
      const labels = data.map(d => d.player_name);
      const throws = data.map(d => parseFloat(d.longest_throw));
      const pdgaLinks = data.map(d => d.pdga_number);

      const longestThrowChart = new Chart(longestCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Longest Throw (feet)',
            data: throws,
            backgroundColor: 'rgba(0, 123, 255, 0.6)',
            borderColor: 'rgba(0, 123, 255, 1)',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onHover: function (event, chartElement) {
            const canvas = event.native?.target || event.target;
            canvas.style.cursor = chartElement.length > 0 ? 'pointer' : 'default';
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.raw} ft (click to view profile)`
              }
            },
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Distance (ft)'
              }
            }
          }
        }
      });

      longestCtx.onclick = function (evt) {
        const points = longestThrowChart.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, false);
        if (points.length > 0) {
          const index = points[0].index;
          const pdgaNumber = pdgaLinks[index];
          window.open(`./../index.php?pdga_number=${pdgaNumber}`, '_blank');
        }
      };
    });

  // Chart 3: Top Earners
  const topEarnerCtx = document.getElementById('topEarnerChart');
  fetch('../api/fetch_top_earners.php')
    .then(res => res.json())
    .then(data => {
      const labels = data.map(d => d.player_name);
      const pdgaLinks = data.map(d => d.pdga_number);
      const cash = data.map(d => parseFloat(d.total_cash));

      const topEarnerChart = new Chart(topEarnerCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Career Earnings ($)',
            data: cash,
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onHover: function (event, chartElement) {
            const canvas = event.native?.target || event.target;
            canvas.style.cursor = chartElement.length > 0 ? 'pointer' : 'default';
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: ctx => `$${ctx.raw.toLocaleString()}`
              }
            },
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Earnings ($)'
              },
              ticks: {
                callback: value => `$${value.toLocaleString()}`
              }
            }
          }
        }
      });

      topEarnerCtx.onclick = function (evt) {
        const points = topEarnerChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
        if (points.length > 0) {
          const index = points[0].index;
          const pdgaNumber = pdgaLinks[index];
          window.open(`./../index.php?pdga_number=${pdgaNumber}`, '_blank');
        }
      };
    });
});



// creating radar graph for players_list's name
(async function() {
  const radarContainer = document.getElementById('hoverRadar');
  const radarCtx       = document.getElementById('radarChart').getContext('2d');
  const statsList      = document.getElementById('radarStats');
  let radarChart       = null;

 
  const importantStats = ['FWH','C2P','BRD-','SCR','C1X'];

  $('#player_table').on('draw.dt', () => {
    document.querySelectorAll('#player_table a').forEach(link => {
      if (link._hasRadar) return;
      link._hasRadar = true;

      link.addEventListener('mouseenter', async () => {
        const pdga = link.href.match(/pdga_number=(\d+)/)[1];
        const stats = await fetch(`../api/get_player_stats.php?pdga_number=${pdga}`)
                              .then(r => r.json());

        
        const filtered = importantStats.map(abbr => {
          const s = stats.find(x => x.abbreviation === abbr);
          return {
            abbreviation: abbr,
            stat_name:    s?.stat_name || abbr,
            value:        parseFloat(s?.value) || 0
          };
        });

        const labels = filtered.map(s => s.abbreviation);
        const data   = filtered.map(s => s.value);
        const maxVal = Math.max(...data, 0);

        // destroy old chart if it exists
        if (radarChart) radarChart.destroy();

        // create a spacious, smooth, square radar
        radarChart = new Chart(radarCtx, {
          type: 'radar',
          data: {
            labels: labels,
            datasets: [{
              label: link.textContent,
              data: data,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor:   'rgba(255, 99, 132, 1)',
              borderWidth: 3,
              pointRadius: 6,
              pointBackgroundColor: 'rgba(255, 99, 132, 1)'
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            layout: { padding: 24 },
            elements: {
              line: { tension: 0.4, borderWidth: 3 },
              point:{ radius: 6, hoverRadius: 8 }
            },
            plugins: {
              title: {
                display: true,
                text: link.textContent,
                font: { size: 18, weight: '500' },
                padding: { bottom: 12 }
              },
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.7)',
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                  label: ctx => `${ctx.raw}`
                }
              }
            },
            scales: {
              r: {
                beginAtZero: true,
                suggestedMax: maxVal * 1.1,
                grid:       { color: '#e0e0e0', lineWidth: 1 },
                angleLines: { color: '#f0f0f0' },
                pointLabels:{
                  display: true,
                  font: { size: 12, family: 'Arial' },
                  color: '#555'
                },
                ticks: { display: false }
              }
            }
          }
        });

        // render the five stats below
        statsList.innerHTML = filtered.map(s =>
          `<li><span>${s.stat_name}</span><span>${s.value.toFixed(1)}</span></li>`
        ).join('');

        // position & show the hover card
        const rect = link.getBoundingClientRect();
        radarContainer.style.top     = `${rect.bottom + window.scrollY + 12}px`;
        radarContainer.style.left    = `${rect.left   + window.scrollX}px`;
        radarContainer.style.display = 'block';
      });

      link.addEventListener('mouseleave', () => {
        radarContainer.style.display = 'none';
      });
    });
  });
})();