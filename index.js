const graphContainer = document.getElementById("graphContainer")
const fileAcceptor = document.getElementById("fileAcceptor")
const convertBtn = document.getElementById("convertBtn")
const changeClr = document.getElementById("changeClr")
const changeSize = document.getElementById("changeSize")
const changeFontSize = document.getElementById("changeFontSize")

let fileUrl = ""
let svgFileName = ""
let sheetIndex = 0
const frequencyArr = []

let rootSize = 50
let boxSize = 15
let siteRadius = 2
let svgSize = 3

let fontSizes = {
    rootFont: 15,
    geneFont: 10,
    siteFont: 10
}

const colors = {
    pathClr: "#555",
    UDDUClr: "green",
    UUDDClr: "blue",
    bothClr: "red",
}

function defaultValueLoader() { //setting the default values to the input fields
    document.getElementById("clrInpt1").value = "#595A6E"
    document.getElementById("clrInpt2").value = "#15E523"
    document.getElementById("clrInpt3").value = "#4391DB"
    document.getElementById("clrInpt4").value = "#E50606"

    document.getElementById("number1").value = 50
    document.getElementById("number2").value = 15
    document.getElementById("number3").value = 2
    document.getElementById("number4").value = 3

    document.getElementById("fsize1").value = 15
    document.getElementById("fsize2").value = 10
    document.getElementById("fsize3").value = 10
}
defaultValueLoader()

// getting the file metadata from the user selected file
convertBtn.addEventListener("click", (e) => {
    e.preventDefault()
    const fileInputBtn = document.getElementById("fileInputBtn")
    sheetIndex = document.getElementById("sheetIndexInpt").value - 1

    if (sheetIndex < 0) {
        return alert("Sheet number starts from 1 or above!!!!")
    }
    const file = fileInputBtn.files[0]
    if (!file) {
        return fileInputBtn.click()
    }
    svgFileName = file.name.split(".")[0]

    const acceptedFormat = ["xlsx", "xls"]
    const fileExtension = file.name.split(".").pop()

    if (acceptedFormat.includes(fileExtension.toLowerCase())) {
        fileUrl = URL.createObjectURL(file)
        fileAcceptor.style.display = "none"
        graphContainer.style.display = "block"

        fetchFileData(fileUrl, sheetIndex)

    } else {
        alert("Select only excel file")
        window.location.reload()
    }
})

changeClr.addEventListener("click", (e) => {
    e.preventDefault()
    colors.pathClr = document.getElementById("clrInpt1").value || "#595A6E"
    colors.UDDUClr = document.getElementById("clrInpt2").value || "#15E523"
    colors.UUDDClr = document.getElementById("clrInpt3").value || "#4391DB"
    colors.bothClr = document.getElementById("clrInpt4").value || "#E50606"

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)

})


changeSize.addEventListener("click", (e) => {
    e.preventDefault()
    rootSize = parseInt(document.getElementById("number1").value)
    boxSize = parseInt(document.getElementById("number2").value)
    siteRadius = parseInt(document.getElementById("number3").value)
    svgSize = parseInt(document.getElementById("number4").value)

    if (rootSize < 1 || boxSize < 1 || siteRadius < 1 || svgSize < 1) {
        return alert("Size value must be more than zero !!!!")
    }

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)
})

changeFontSize.addEventListener("click", (e) => {
    e.preventDefault()
    fontSizes.rootFont = parseInt(document.getElementById("fsize1").value) || 15
    fontSizes.geneFont = parseInt(document.getElementById("fsize2").value) || 10
    fontSizes.siteFont = parseInt(document.getElementById("fsize3").value) || 10

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, 0)

})

// fetchFileData("Binary_S348.xlsx", 0)

//fetching the data from the file and preprocessing the data 
function fetchFileData(fileUrl, sheetIndex) {
    fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[sheetIndex]
            if (!sheetName) {
                alert("There is no sheet found using this sheet number try again")
                window.location.reload()
            }
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
            const root = {
                name: "",
                children: [],
                code: ""
            };

            const geneMap = new Map(); //container for the Genes
            sheetData.forEach((e, i) => {
                const gene = e.Genes;
                const site = e.Sites;
                const code = e.Code.split("+")[0]
                const frequency = e.Frequency

                if (i == 0) {
                    root.name = gene
                    root.children.push({ name: site, frequency, code })
                    root.code = code
                }
                else if (root.name == gene) {
                    root.children.push({ name: site, frequency, code })
                    root.code = code
                }
                else {
                    if (!geneMap.has(gene)) {
                        geneMap.set(gene, { name: gene, children: [], frequency, code });
                        root.children.push(geneMap.get(gene));
                    }
                    const geneNode = geneMap.get(gene);
                    if (!geneNode.children.find(child => child.name === site)) {
                        geneNode.children.push({ name: site, frequency, code });
                        frequencyArr.push(frequency)
                    }
                }
            });
            drawChart(root)
        })
        .catch(err => {
            console.error("Error Found !!!", err);
            alert("Error found :", err, " Check your input file with names (Genes,Sites,Code,Frequency) also match the case")
        })
}

function drawChart(data) {
    const width = 1200;
    const cx = width * 0.5
    const radius = width / 2 - (50 * svgSize);

    //selecting the svg with id chart
    const svg = d3
        .select("#chart")
        .attr("height", width)
        .attr("width", width)
        .attr("viewBox", [-cx, -cx, width, width])
        .style("border", "2px solid red")
        .attr("style", "width:100%;height:auto;")

    const tree = d3
        .tree()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)

    //creating the data in the tree form and data is in ascending order 
    const root = tree(d3
        .hierarchy(data)
        .sort((a, b) => d3.ascending(a.data.name, b.data.name))
    )

    // plotting paths 
    svg
        .append("g")
        .attr("fill", "none")
        .attr("stroke", colors.pathClr)
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 0.75)
        .selectAll()
        .data(root.links())
        .join("path")
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => {
                if (d.depth == 1 && !d.children) {
                    return d.y + 90 + (d.data.frequency / Math.min(...frequencyArr)) * siteRadius
                }
                return d.y + 30
            }))

    //creating the rectangles and circles
    svg
        .append("g")
        .selectAll()
        .data(root.descendants())
        .join(function (e) {
            const node = e.append("g")
            node.filter(d => d.children)
                .append("rect")
                .attr("x", d => d.depth === 0 ? -(rootSize / 2) : -15)
                .attr("y", d => d.depth === 0 ? -(rootSize / 2) : 0 - (boxSize / 2))
                .attr("width", d => d.depth === 0 ? rootSize : boxSize)
                .attr("height", d => d.depth === 0 ? rootSize : boxSize)
                .attr("fill", d => colorForGenes(d))

            node.filter(d => !d.children)
                .append("circle")
                .attr("r", d => (d.data.frequency / Math.min(...frequencyArr)) * siteRadius)
                .attr("fill", d => colorForSites(d))
                .attr("stroke", "black")
                .call(d3.drag() //drag handling
                    .on("start", dragStarted)
                    .on("drag", draggingCircle)
                    .on("end", dragEnded)
                )
            return node
        })
        .attr("transform", d => alignShapes(d))
        .attr("stroke", "black")
        .attr("stroke-width", 0.75)
        .attr("stroke-opacity", 1)




    //dragging functions 
    function dragStarted() {
        d3.select(this).raise().classed("active", true);
    }


    //drag controls
    function draggingCircle(d) {
        if (d.depth === 1 && !d.children) {
            return d3.select(this) //adjust the values as required
                .attr("transform", `rotate(${90}) translate(${d.x >= Math.PI ? d3.event.y - (380 - 50 * svgSize) : d3.event.y - (600 - 50 * svgSize)},${-d3.event.x})`)
        }
        if (d.depth === 2 && !d.children) {
            return d3.select(this) //adjust the values as required
                .attr("transform", `rotate(${90}) translate(${d.x >= Math.PI ? d3.event.y - (600 - 50 * svgSize) : d3.event.y - (600 - 50 * svgSize)},${-d3.event.x})`)
        }
    }
    function dragEnded() {
        d3.select(this).classed("active", false);
    }

    //alligning the shapes based on the depth
    function alignShapes(d) {
        if (d.depth === 0) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + 20},-3)`
        }
        else if (d.depth == 1 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + 70},-3)`
        }
        else if (d.depth == 1 && d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},${d.x >= Math.PI ? -3 : 0})`
        }
        else
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`
    }

    // assigning colors for the gene
    function colorForGenes(d) {
        let found = {
            1: false,
            2: false
        }
        let color = ""
        d.children.forEach(e => {
            if (e.data.code === "UDDU") {
                found[1] = true
            } else if (e.data.code === "UUDD") {
                found[2] = true
            }

        })
        if (found[1] == true && found[2] == true) {
            color = colors.bothClr
        }
        else if (found[1] == true || found[2] == true) {
            if (d.data.code == "UUDD") {
                color = colors.UUDDClr
            }
            else if (d.data.code == "UDDU") {
                color = colors.UDDUClr
            }

        }
        return color
    }

    // color for sites
    function colorForSites(d) {
        let color = ""
        if (d.data.code == "UUDD") {
            color = colors.UUDDClr
        }
        else if (d.data.code == "UDDU") {
            color = colors.UDDUClr
        }

        return color;
    }

    // plotting the text
    svg
        .append("g")
        .selectAll()
        .data(root.descendants())
        .join("text")
        .attr("transform", d => alignText(d))
        .style("font-size", d => fontSize(d))
        .style("font-weight", "bold")
        .attr("dy", "0.1em")
        .text(d => d.data.name)

    // fontsize for the different nodes 
    function fontSize(d) {
        if (d.depth === 0) {
            return fontSizes.rootFont
        }
        else if (d.depth === 1 && d.children) {
            return fontSizes.geneFont
        }
        else if ((d.depth === 2 && !d.children) || (d.depth == 1 && !d.children)) {
            return fontSizes.siteFont
        }
    }

    // alinging the text according to depth
    function alignText(d) {
        if (d.depth === 0) {
            return `rotate(${0})
                    translate(${d.x - (rootSize / 2) + 10},${d.y + 20})
                    `
        }

        else if (d.depth == 1 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                    translate(${d.x >= Math.PI ? d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius) + 120 : d.y + 10},0) 
                    rotate(${d.x >= Math.PI ? 180 : 0})
                    `
        }
        else if (d.depth === 1) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                    translate(${d.x >= Math.PI ? d.y + 30 + boxSize : d.y - 10 + boxSize},0) 
                    rotate(${d.x >= Math.PI ? 180 : 0})
                    `
        }
        else if (d.depth === 2 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                translate(${d.x >= Math.PI ? (d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius)
                    + 50) : (d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius) + 25)},0) 
                rotate(${d.x >= Math.PI ? 180 : 0})
            `

        }
    }
}


// downloading the svg by converting into it
const svgElement = document.querySelector("#chart");
const downloadButton = document.querySelector("#downloadButton");

downloadButton.addEventListener("click", () => {
    const svgContent = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = svgFileName
    link.click();
});

// editBtn handling
const editingBtns = document.getElementById("editingBtns")

editingBtns.onclick = () => {
    const editBtn = document.getElementById("editBtn")
    const closeBtn = document.getElementById("closeBtn")
    const optionsContainer = document.getElementById("optionsContainer")
    if (editBtn.style.display !== "none") {
        editBtn.style.display = "none"
        closeBtn.style.display = "flex"
        optionsContainer.style.display = "flex"
    } else {
        editBtn.style.display = "flex"
        closeBtn.style.display = "none"
        optionsContainer.style.display = "none"
    }
}


