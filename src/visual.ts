/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";
import { select } from "d3";
import * as d3 from "d3";

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    public visualSVG: any;
    private renderTree(data: any) {
        const width = 628;
        const marginTop = 10;
        const marginRight = 10;
        const marginBottom = 10;
        const marginLeft = 40;
    
        const root = d3.hierarchy(data);
        const dx = 10;
        const dy = (width - marginRight - marginLeft) / (1 + root.height);
    
        const tree = d3.tree().nodeSize([dx, dy]);
        const diagonal = d3.linkHorizontal<any, d3.HierarchyPointNode<any>>()
        .x((d) => d.y)
        .y((d) => d.x);
    
        const svg = this.visualSVG
            .attr('width', width)
            .attr('height', dx)
            .attr('viewBox', [-marginLeft, -marginTop, width, dx])
            .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;');
    
        const gLink = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5);

        const gNode = svg.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");
        
        const colorScale = d3.scaleSequential(d3.interpolateRainbow).domain([0, root.height]);

        function update(event: any,source: any) {
             const duration = event?.altKey ? 2500 : 250;
            const nodes = root.descendants().reverse();
            const links = root.links();
            console.log(nodes)
            tree(root);

            let left = root as any;
            let right = root as any;
            root.eachBefore((node: any) => {
                if (node.x < left.x!) left = node;
                if (node.x > right.x!) right = node;
              });

             const height = right.x! - left.x! + marginTop + marginBottom;

            const transition = svg.transition()
            .duration(duration)
            .attr("height", height)
            .attr("viewBox", [-marginLeft, left.x! - marginTop, width, height])
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

            const node = gNode.selectAll("g")
            .data(nodes,(d: any) => d.id);

            const nodeEnter = node.enter().append("g")
            .attr("transform", (d: any) => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
            d.children = d.children ? null : d._children;
            update(event, d);
        });

        nodeEnter.append("circle")
        .attr("r", 2.5)
        .attr("fill", (d: any) => d._children ? "#555" : colorScale(d.depth))
        .attr("stroke-width", 10);

        nodeEnter.append("text")
       .attr("dy", "0.31em")
       .attr("x", (d: any) => d._children ? -6 : 6)
       .attr("text-anchor", (d: any) => d._children ? "end" : "start")
       .text((d: any) => d.data.name)
       .clone(true).lower()
       .attr("stroke-linejoin", "round")
       .attr("stroke-width", 3)
       .attr("stroke", "white");

       const nodeUpdate = node.merge(nodeEnter).transition(transition)
       .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
       .attr("fill-opacity", 1)
       .attr("stroke-opacity", 1);
       console.log(nodeUpdate, "updatenode")

       const nodeExit = node.exit().transition(transition).remove()
       .attr("transform", (d: any) => `translate(${source.y},${source.x})`)
       .attr("fill-opacity", 0)
       .attr("stroke-opacity", 0);
       console.log(nodeExit, "exitnode")

       const link = gLink.selectAll("path")
        .data(links, (d: any) => d.target.id);

        const linkEnter = link.enter().append("path")
       .attr("d", (d: any) => {
         const o = {x: source.x0, y: source.y0};
         return diagonal({source: o, target: o});
       });

       link.merge(linkEnter).transition(transition)
       .attr("d", diagonal);

       link.exit().transition(transition).remove()
       .attr("d", (d: any) => {
         const o = {x: source.x, y: source.y};
         return diagonal({source: o, target: o});
       });

       root.eachBefore((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    

    root.x0 = dy / 2;
    root.y0 = 0;
    root.descendants().forEach ((d: any, i: number) => {
        d.id = i;
        d._children = d.children;
        if (d.depth && d.data.name.length !== 7) d.children = null;
      });
      this.update(null, root)
    }   
    

    
    

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.visualSVG = select(this.target).append('svg').classed('visualSVG', true);
    
        
        const treeData = {
            name: 'Root',
            x0: 0, 
            y0: 0,
            children: [
            { name: 'Child 1', x0: 0, y0: 0 },
            { name: 'Child 2', x0: 0, y0: 0 },
            ],
        };
        
        this.renderTree(treeData);
    }
    

    public update(options: VisualUpdateOptions, data: any) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
    
        this.renderTree(data);

    }
    

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}