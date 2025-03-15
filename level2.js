(function(){
    // Set up dimensions and margins
    const margin = { top: 50, right: 120, bottom: 50, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#level2")
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
        // Filter data for the last 10 years (2008-2017)
        const startYear = 2008;
        const endYear = 2017;
        
        // Process and filter data
        data.forEach(d => {
            const dateParts = d.date.split('-');
            d.year = +dateParts[0];
            d.month = +dateParts[1];
            d.day = +dateParts[2];
            d.max_temperature = +d.max_temperature;
            d.min_temperature = +d.min_temperature;
        });
        
        const filteredData = data.filter(d => d.year >= startYear && d.year <= endYear);
        
        // Group data by year and month
        const nestedData = d3.groups(filteredData, d => d.year, d => d.month);
        
        // Flatten the nested data for the heatmap
        const cellData = [];
        nestedData.forEach(yearGroup => {
            const year = yearGroup[0];
            yearGroup[1].forEach(monthGroup => {
                const month = monthGroup[0];
                const days = monthGroup[1];
                
                // Calculate monthly averages
                const avgMax = d3.mean(days, d => d.max_temperature);
                const avgMin = d3.mean(days, d => d.min_temperature);
                
                cellData.push({
                    year: year,
                    month: month,
                    avgMax: avgMax,
                    avgMin: avgMin,
                    days: days.sort((a, b) => a.day - b.day) // Sort days
                });
            });
        });
        
        // Set up initial view for maximum temperature
        let currentView = "avgMax";
        
        // Define color scales
        const maxTempColorScale = d3.scaleSequential()
            .domain([d3.min(cellData, d => d.avgMax), d3.max(cellData, d => d.avgMax)])
            .interpolator(d3.interpolateOranges);
        
        const minTempColorScale = d3.scaleSequential()
            .domain([d3.min(cellData, d => d.avgMin), d3.max(cellData, d => d.avgMin)])
            .interpolator(d3.interpolateBlues);
        
        // Get unique years and months for scales
        const years = Array.from(new Set(cellData.map(d => d.year))).sort();
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
        
        // Function to create mini line charts within cells
        function createMiniChart(selection, data, tempType) {
            // Set up scales for mini charts
            const dayScale = d3.scaleLinear()
                .domain([1, 31])
                .range([0, xScale.bandwidth()]);
            
            // Different y scales for max and min temperatures
            const tempScale = d3.scaleLinear()
                .domain([
                    d3.min(data.days, d => d.min_temperature) - 1,
                    d3.max(data.days, d => d.max_temperature) + 1
                ])
                .range([yScale.bandwidth(), 0]);
            
            // Create line generators
            const maxLine = d3.line()
                .x(d => dayScale(d.day))
                .y(d => tempScale(d.max_temperature));
            
            const minLine = d3.line()
                .x(d => dayScale(d.day))
                .y(d => tempScale(d.min_temperature));
            
            // Add max temperature line
            selection.append("path")
                .datum(data.days)
                .attr("class", "line-max")
                .attr("d", maxLine);
            
            // Add min temperature line
            selection.append("path")
                .datum(data.days)
                .attr("class", "line-min")
                .attr("d", minLine);
        }
        
        // Create the heatmap cells with mini charts
        function createHeatmap(tempType) {
            // Remove existing cells
            svg.selectAll(".cell-group").remove();
            
            // Determine which color scale to use
            const colorScale = tempType === "avgMax" ? maxTempColorScale : minTempColorScale;
            
            // Create cell groups
            const cellGroups = svg.selectAll(".cell-group")
                .data(cellData)
                .enter()
                .append("g")
                .attr("class", "cell-group")
                .attr("transform", d => `translate(${xScale(d.year)}, ${yScale(months[d.month - 1])})`);
            
            // Add background rectangles
            cellGroups.append("rect")
                .attr("class", "cell")
                .attr("width", xScale.bandwidth())
                .attr("height", yScale.bandwidth())
                .attr("fill", d => colorScale(d[tempType]))
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`Date: ${months[d.month - 1]} ${d.year}<br>` +
                                `Avg Max Temp: ${d.avgMax.toFixed(1)}°C<br>` +
                                `Avg Min Temp: ${d.avgMin.toFixed(1)}°C`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
            
            // Add mini line charts to each cell
            cellGroups.each(function(d) {
                createMiniChart(d3.select(this), d, tempType);
            });
        }
        
        // Create the vertical legend
        function createLegend(tempType) {
            // Remove any existing legend and gradient
            // console.log("Updating legend for:", tempType); // Debugging
            svg.selectAll(".legend").remove();
            svg.select("defs").remove(); 
            d3.selectAll("#temperature-gradient2").remove();
        
            // Determine the appropriate color scale
            const colorScale = tempType === "avgMax" ? maxTempColorScale : minTempColorScale;
            // console.log("Color scale domain:", colorScale.domain()); // Debugging

            // Get the min and max temperature range
            const tempRange = tempType === "avgMax"
                ? [d3.min(cellData, d => d.avgMax), d3.max(cellData, d => d.avgMax)]
                : [d3.min(cellData, d => d.avgMin), d3.max(cellData, d => d.avgMin)];
            // console.log("Temperature range:", tempRange); // Debugging

            // Define legend dimensions
            const legendWidth = 20;
            const legendHeight = 400;
            const legendMargin = 20;
        
            // Append a new group for the legend
            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width + legendMargin}, ${height/2 - legendHeight/2})`);
        
            // Create new gradient definition
            const defs = svg.append("defs");
        
            const linearGradient = defs.append("linearGradient")
                .attr("id", "temperature-gradient2")
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "0%")
                .attr("y2", "0%");
        
            // Remove old gradient stops before appending new ones
            linearGradient.selectAll("stop").remove();
        
            // Define gradient stops dynamically
            const numStops = 10;
            for (let i = 0; i <= numStops; i++) {
                const offset = i / numStops;
                const value = tempRange[0] + offset * (tempRange[1] - tempRange[0]);
                linearGradient.append("stop")
                    .attr("offset", `${offset * 100}%`)
                    .attr("stop-color", colorScale(value));  // Ensure correct mapping

                // console.log("Color scale Value:", colorScale(value));
            }
        
            

            // Append the legend color bar
            legend.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#temperature-gradient2)");
        
            // Create the legend axis
            const legendScale = d3.scaleLinear()
                .domain(tempRange)
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
                .text(tempType === "avgMax" ? "Avg Max Temp (°C)" : "Avg Min Temp (°C)");

            // Add line chart legend
            const lineLegend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 20}, ${height/2.3 + legendHeight/2 + 40})`);
        
            // Max temp line
            lineLegend.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 20)
                .attr("y2", 0)
                .attr("class", "line-max");
            
            lineLegend.append("text")
                .attr("x", 25)
                .attr("y", 4)
                .text("Daily Max Temp")
                .style("font-size", "10px");
            
            // Min temp line
            lineLegend.append("line")
                .attr("x1", 0)
                .attr("y1", 10)
                .attr("x2", 20)
                .attr("y2", 10)
                .attr("class", "line-min");
            
            lineLegend.append("text")
                .attr("x", 25)
                .attr("y", 14)
                .text("Daily Min Temp")
                .style("font-size", "10px");
        }
        
        // Initial render
        createHeatmap(currentView);
        createLegend(currentView);
        
        // Button event handlers
        d3.select("#maxTemp2").on("click", function() {
            console.log("Max Temp button clicked"); // Debugging
            d3.select("#maxTemp2").classed("active", true);
            d3.select("#minTemp2").classed("active", false);
            currentView = "avgMax";
            createHeatmap(currentView);
            createLegend(currentView);
        });
        
        d3.select("#minTemp2").on("click", function() {
            console.log("Min Temp button clicked"); // Debugging
            d3.select("#maxTemp2").classed("active", false);
            d3.select("#minTemp2").classed("active", true);
            currentView = "avgMin";
            createHeatmap(currentView);
            createLegend(currentView);
        });
    });
})();