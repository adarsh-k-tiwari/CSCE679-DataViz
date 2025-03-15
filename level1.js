(function() {        // Set up dimensions and margins
        const margin = {top: 50, right: 120, bottom: 50, left: 80 };
        const width = 1000 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Create SVG container
        const svg = d3.select("#level1")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Create tooltip div
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Parse the CSV data
        d3.csv("temperature_daily.csv").then(function(data) {
            // Process data to get monthly averages
            const monthlyData = processData(data);
            
            // Set up initial view for maximum temperature
            let currentView = "max_temperature";
            
            // Define color scales
            const maxTempColorScale = d3.scaleSequential()
                .domain([d3.min(monthlyData, d => d.max_temperature), d3.max(monthlyData, d => d.max_temperature)])
                .interpolator(d3.interpolateOranges);
            
            const minTempColorScale = d3.scaleSequential()
                .domain([d3.min(monthlyData, d => d.min_temperature), d3.max(monthlyData, d => d.min_temperature)])
                .interpolator(d3.interpolateBlues);
            
            // Get unique years and months for scales
            const years = Array.from(new Set(monthlyData.map(d => d.year))).sort();
            const months = ["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"];
            
            // Create scales
            const xScale = d3.scaleBand()
                .domain(years)
                .range([0, width])
                .padding(0.05);
            
            const yScale = d3.scaleBand()
                .domain(months)
                .range([0, height])
                .padding(0.05);
            
            // Create axes
            const xAxis = d3.axisTop(xScale)
                .tickValues(xScale.domain());
            
            const yAxis = d3.axisLeft(yScale);
            
            svg.append("g")
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "center");
            
            svg.append("g")
                .call(yAxis);
            
            // Create the heatmap cells
            function createHeatmap(tempType) {
                // Remove existing cells
                svg.selectAll(".cell").remove();
                
                // Determine which color scale to use
                const colorScale = tempType === "max_temperature" ? maxTempColorScale : minTempColorScale;
                
                // Create cells
                svg.selectAll(".cell")
                    .data(monthlyData)
                    .enter()
                    .append("rect")
                    .attr("class", "cell")
                    .attr("x", d => xScale(d.year))
                    .attr("y", d => yScale(months[d.month - 1]))
                    .attr("width", xScale.bandwidth())
                    .attr("height", yScale.bandwidth())
                    .attr("fill", d => colorScale(d[tempType]))
                    .on("mouseover", function(event, d) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html(`Date: ${months[d.month - 1]} ${d.year}<br>` +
                                    `${tempType === "max_temperature" ? "Max" : "Min"} Temperature: ${d[tempType]}°C`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            }
            
            // Create the legend
            function createLegend(tempType) {
                // Remove existing legend
                svg.selectAll(".legend").remove();
                svg.select("defs").remove(); 
                d3.selectAll("#temperature-gradient").remove();

                // Determine which color scale to use
                const colorScale = tempType === "max_temperature" ? maxTempColorScale : minTempColorScale;
                
                const tempRange = tempType == "max_temperature"
                    ? [d3.min(monthlyData, d => d.max_temperature), d3.max(monthlyData, d => d.max_temperature)]
                    : [d3.min(monthlyData, d => d.min_temperature), d3.max(monthlyData, d => d.min_temperature)];
                
                // Create legend gradient
                const legendWidth = 20;
                const legendHeight = 400;
                
                const legend = svg.append("g")
                    .attr("class", "legend")
                    .attr("transform", `translate(${width + 10}, ${height/2 - legendHeight/2})`);
                
                // Create gradient definition
                const defs = svg.append("defs");
                const linearGradient = defs.append("linearGradient")
                    .attr("id", "temperature-gradient")
                    .attr("x1", "0%")
                    .attr("y1", "100%")
                    .attr("x2", "0%")
                    .attr("y2", "0%");
                
                // Create color stops
                const numStops = 10;
                for (let i = 0; i <= numStops; i++) {
                    const offset = i / numStops;
                    const value = tempRange[0] + offset * (tempRange[1] - tempRange[0]);
                    linearGradient.append("stop")
                        .attr("offset", `${offset * 100}%`)
                        .attr("stop-color", colorScale(value));
                }
                
                // Create the colored rectangle
                legend.append("rect")
                    .attr("width", legendWidth)
                    .attr("height", legendHeight)
                    .style("fill", "url(#temperature-gradient)");
                
                // Create the legend axis
                const legendScale = d3.scaleLinear()
                    .domain([tempRange[0], tempRange[1]])
                    .range([legendHeight, 0]);
                
                const legendAxis = d3.axisRight(legendScale)
                .ticks(5)
                .tickFormat(d => `${d.toFixed(1)}°C`);
                    
                legend.append("g")
                    .attr("transform", `translate(${legendWidth}, 0)`)
                    .call(legendAxis);
                
                // Add legend title
                legend.append("text")
                    .attr("class", "legend-label")
                    .attr("x", -10)
                    .attr("y", -10)
                    .text(tempType === "max_temperature" ? "Max Temp (°C)" : "Min Temp (°C)");
            }
            
            // Initial render
            createHeatmap(currentView);
            createLegend(currentView);
            
            // Button event handlers
            d3.select("#maxTemp1").on("click", function() {
                d3.select("#maxTemp1").classed("active", true);
                d3.select("#minTemp1").classed("active", false);
                currentView = "max_temperature";
                createHeatmap(currentView);
                createLegend(currentView);
            });
            
            d3.select("#minTemp1").on("click", function() {
                d3.select("#maxTemp1").classed("active", false);
                d3.select("#minTemp1").classed("active", true);
                currentView = "min_temperature";
                createHeatmap(currentView);
                createLegend(currentView);
            });
            
            // Function to process data into monthly averages
            function processData(rawData) {
                const monthlyTemp = [];
                
                // Parse date and temperature values
                rawData.forEach(d => {
                    const dateParts = d.date.split('-');
                    const year = dateParts[0];
                    const month = parseInt(dateParts[1]);
                    
                    const maxTemp = parseFloat(d.max_temperature);
                    const minTemp = parseFloat(d.min_temperature);
                    
                    // Find if we already have an entry for this year/month
                    const existingEntry = monthlyTemp.find(entry => 
                        entry.year === year && entry.month === month);
                    
                    if (existingEntry) {
                        existingEntry.days.push({ max: maxTemp, min: minTemp });
                    } else {
                        monthlyTemp.push({
                            year: year,
                            month: month,
                            days: [{ max: maxTemp, min: minTemp }]
                        });
                    }
                });
                
                // Calculate monthly averages
                monthlyTemp.forEach(entry => {
                    // Calculate max temperature (average of daily maximums)
                    entry.max_temperature = d3.mean(entry.days, d => d.max);
                    
                    // Calculate min temperature (average of daily minimums)
                    entry.min_temperature = d3.mean(entry.days, d => d.min);
                    
                    // Round to one decimal place
                    entry.max_temperature = Math.round(entry.max_temperature * 10) / 10;
                    entry.min_temperature = Math.round(entry.min_temperature * 10) / 10;
                    
                    // Remove the days array as we don't need it anymore
                    delete entry.days;
                });
                
                return monthlyTemp;
            }
        });
})();