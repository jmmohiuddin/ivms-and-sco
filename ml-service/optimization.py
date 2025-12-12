"""
Supply Chain Optimization Module
Implements optimization algorithms for inventory and vendor selection
"""

import numpy as np
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class SupplyChainOptimizer:
    """
    Supply chain optimization algorithms:
    - Inventory optimization (EOQ, Safety Stock)
    - Vendor selection (Multi-criteria decision making)
    - Scenario simulation
    """
    
    def optimize_inventory(self, products: List[Dict], constraints: Dict) -> Dict[str, Any]:
        """
        Optimize inventory levels for multiple products
        
        Args:
            products: List of product data with costs and forecasts
            constraints: Budget and storage constraints
            
        Returns:
            Optimization recommendations
        """
        recommendations = []
        total_savings = 0
        
        max_budget = constraints.get('max_budget', float('inf'))
        max_storage = constraints.get('max_storage', float('inf'))
        
        for product in products:
            product_id = product.get('product_id')
            current_stock = product.get('current_stock', 0)
            demand_forecast = product.get('demand_forecast', [])
            lead_time = product.get('lead_time', 7)
            holding_cost = product.get('holding_cost', 0.25)
            ordering_cost = product.get('ordering_cost', 50)
            stockout_cost = product.get('stockout_cost', 100)
            unit_cost = product.get('unit_cost', 10)
            
            # Calculate annual demand
            avg_daily_demand = np.mean(demand_forecast) if demand_forecast else 10
            annual_demand = avg_daily_demand * 365
            
            # EOQ calculation
            eoq = self._calculate_eoq(annual_demand, ordering_cost, holding_cost * unit_cost)
            
            # Safety stock calculation
            demand_std = np.std(demand_forecast) if len(demand_forecast) > 1 else avg_daily_demand * 0.2
            safety_stock = self._calculate_safety_stock(demand_std, lead_time, 0.95)
            
            # Reorder point
            reorder_point = (avg_daily_demand * lead_time) + safety_stock
            
            # Current cost vs optimized cost
            current_annual_cost = self._calculate_inventory_cost(
                current_stock, annual_demand, ordering_cost, holding_cost * unit_cost
            )
            optimal_annual_cost = self._calculate_inventory_cost(
                eoq, annual_demand, ordering_cost, holding_cost * unit_cost
            )
            
            savings = max(0, current_annual_cost - optimal_annual_cost)
            total_savings += savings
            
            # Generate recommendation
            action = 'maintain'
            if current_stock < reorder_point:
                action = 'reorder'
            elif current_stock > eoq * 2:
                action = 'reduce_stock'
            
            recommendations.append({
                'product_id': product_id,
                'action': action,
                'current_stock': current_stock,
                'optimal_order_quantity': round(eoq, 0),
                'reorder_point': round(reorder_point, 0),
                'safety_stock': round(safety_stock, 0),
                'estimated_savings': round(savings, 2),
                'priority': 'high' if current_stock < safety_stock else 'medium' if action != 'maintain' else 'low'
            })
        
        # Sort by priority and savings
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda x: (priority_order[x['priority']], -x['estimated_savings']))
        
        return {
            'recommendations': recommendations,
            'total_savings': round(total_savings, 2),
            'score': self._calculate_optimization_score(recommendations)
        }
    
    def select_vendors(self, vendors: List[Dict], requirements: Dict, weights: Dict) -> Dict[str, Any]:
        """
        Multi-criteria vendor selection using weighted scoring
        
        Args:
            vendors: List of vendor data
            requirements: Order requirements
            weights: Criteria weights
            
        Returns:
            Vendor rankings and allocation recommendations
        """
        if not vendors:
            return {'rankings': [], 'allocation': [], 'analysis': {}}
        
        # Normalize weights
        total_weight = sum(weights.values()) or 1
        norm_weights = {k: v / total_weight for k, v in weights.items()}
        
        # Default weights if not provided
        default_weights = {
            'price': 0.3,
            'quality': 0.25,
            'delivery': 0.25,
            'capacity': 0.2
        }
        for key in default_weights:
            if key not in norm_weights:
                norm_weights[key] = default_weights[key]
        
        # Calculate scores for each vendor
        scores = []
        for vendor in vendors:
            score = self._calculate_vendor_score(vendor, norm_weights, requirements)
            scores.append({
                'vendor_id': vendor.get('vendor_id'),
                'vendor_name': vendor.get('name', 'Unknown'),
                'overall_score': round(score['overall'], 2),
                'component_scores': score['components'],
                'meets_requirements': score['meets_requirements']
            })
        
        # Sort by score
        scores.sort(key=lambda x: x['overall_score'], reverse=True)
        
        # Calculate allocation for top vendors
        allocation = self._calculate_vendor_allocation(scores, requirements)
        
        return {
            'rankings': scores,
            'allocation': allocation,
            'analysis': {
                'top_performer': scores[0]['vendor_id'] if scores else None,
                'avg_score': round(np.mean([s['overall_score'] for s in scores]), 2),
                'qualified_vendors': sum(1 for s in scores if s['meets_requirements'])
            }
        }
    
    def simulate_scenario(self, base: Dict, changes: Dict, duration: int) -> Dict[str, Any]:
        """
        Simulate what-if scenarios
        
        Args:
            base: Base scenario parameters
            changes: Changes to simulate
            duration: Simulation duration in days
            
        Returns:
            Simulation results and impact analysis
        """
        # Base metrics
        base_demand = base.get('daily_demand', 100)
        base_lead_time = base.get('lead_time', 7)
        base_price = base.get('unit_price', 10)
        base_stock = base.get('current_stock', 500)
        
        # Apply changes
        demand_change = changes.get('demand_change_pct', 0) / 100
        lead_time_change = changes.get('lead_time_change', 0)
        price_change = changes.get('price_change_pct', 0) / 100
        
        new_demand = base_demand * (1 + demand_change)
        new_lead_time = base_lead_time + lead_time_change
        new_price = base_price * (1 + price_change)
        
        # Simulate inventory over time
        baseline_results = self._simulate_inventory(base_demand, base_lead_time, base_stock, duration)
        simulated_results = self._simulate_inventory(new_demand, new_lead_time, base_stock, duration)
        
        # Calculate impact
        impact = {
            'demand_impact': round((new_demand - base_demand) * duration, 2),
            'cost_impact': round((new_price - base_price) * new_demand * duration, 2),
            'stockout_risk_change': simulated_results['stockout_days'] - baseline_results['stockout_days'],
            'service_level_change': simulated_results['service_level'] - baseline_results['service_level']
        }
        
        # Recommendations
        recommendations = []
        if impact['stockout_risk_change'] > 0:
            recommendations.append({
                'action': 'increase_safety_stock',
                'reason': 'Higher stockout risk detected',
                'priority': 'high'
            })
        if demand_change > 0.1:
            recommendations.append({
                'action': 'negotiate_volume_discount',
                'reason': 'Increased demand volume',
                'priority': 'medium'
            })
        if lead_time_change > 2:
            recommendations.append({
                'action': 'find_alternative_supplier',
                'reason': 'Lead time increase impacts service level',
                'priority': 'high'
            })
        
        return {
            'baseline': baseline_results,
            'simulated': simulated_results,
            'impact': impact,
            'recommendations': recommendations
        }
    
    def _calculate_eoq(self, annual_demand: float, ordering_cost: float, holding_cost: float) -> float:
        """Economic Order Quantity formula"""
        if holding_cost <= 0:
            return annual_demand / 12  # Monthly order
        return np.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
    
    def _calculate_safety_stock(self, demand_std: float, lead_time: float, service_level: float) -> float:
        """Safety stock using normal distribution"""
        z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
        z = z_scores.get(service_level, 1.65)
        return z * demand_std * np.sqrt(lead_time)
    
    def _calculate_inventory_cost(self, order_qty: float, annual_demand: float, 
                                   ordering_cost: float, holding_cost: float) -> float:
        """Total annual inventory cost"""
        if order_qty <= 0:
            return float('inf')
        orders_per_year = annual_demand / order_qty
        ordering_total = orders_per_year * ordering_cost
        holding_total = (order_qty / 2) * holding_cost
        return ordering_total + holding_total
    
    def _calculate_vendor_score(self, vendor: Dict, weights: Dict, requirements: Dict) -> Dict[str, Any]:
        """Calculate weighted vendor score"""
        components = {}
        
        # Price score (lower is better, normalized 0-100)
        max_price = requirements.get('max_price', vendor.get('price', 100) * 1.5)
        price = vendor.get('price', max_price)
        components['price'] = max(0, 100 * (1 - price / max_price))
        
        # Quality score (already 0-100)
        components['quality'] = vendor.get('quality_score', 50)
        
        # Delivery reliability (already 0-100)
        components['delivery'] = vendor.get('delivery_reliability', 50)
        
        # Capacity score
        required_capacity = requirements.get('quantity', 100)
        vendor_capacity = vendor.get('capacity', required_capacity)
        components['capacity'] = min(100, (vendor_capacity / required_capacity) * 100)
        
        # Calculate weighted overall score
        overall = sum(components.get(k, 50) * weights.get(k, 0.25) for k in weights)
        
        # Check requirements
        meets_requirements = True
        if vendor.get('lead_time', 0) > requirements.get('max_lead_time', float('inf')):
            meets_requirements = False
        if vendor.get('quality_score', 0) < requirements.get('min_quality', 0):
            meets_requirements = False
        
        return {
            'overall': overall,
            'components': components,
            'meets_requirements': meets_requirements
        }
    
    def _calculate_vendor_allocation(self, scores: List[Dict], requirements: Dict) -> List[Dict]:
        """Calculate order allocation among top vendors"""
        quantity = requirements.get('quantity', 100)
        qualified = [s for s in scores if s['meets_requirements']]
        
        if not qualified:
            return []
        
        # Allocate based on scores
        total_score = sum(s['overall_score'] for s in qualified[:3])  # Top 3
        allocation = []
        
        for vendor in qualified[:3]:
            share = vendor['overall_score'] / total_score if total_score > 0 else 1/3
            allocation.append({
                'vendor_id': vendor['vendor_id'],
                'allocation_pct': round(share * 100, 1),
                'quantity': round(quantity * share, 0)
            })
        
        return allocation
    
    def _simulate_inventory(self, daily_demand: float, lead_time: float, 
                           initial_stock: float, duration: int) -> Dict[str, Any]:
        """Simulate inventory levels over time"""
        stock = initial_stock
        stockout_days = 0
        orders_placed = 0
        
        for day in range(duration):
            # Random demand variation
            demand = max(0, daily_demand + np.random.normal(0, daily_demand * 0.2))
            stock -= demand
            
            if stock < 0:
                stockout_days += 1
                stock = 0
            
            # Reorder when low
            if stock < daily_demand * lead_time * 1.5:
                orders_placed += 1
                # Stock arrives after lead time (simplified)
                stock += daily_demand * lead_time * 2
        
        service_level = 100 * (1 - stockout_days / duration)
        
        return {
            'final_stock': round(stock, 0),
            'stockout_days': stockout_days,
            'service_level': round(service_level, 2),
            'orders_placed': orders_placed,
            'avg_stock': round(initial_stock / 2, 0)  # Simplified
        }
    
    def _calculate_optimization_score(self, recommendations: List[Dict]) -> float:
        """Calculate overall optimization score"""
        if not recommendations:
            return 100
        
        high_priority = sum(1 for r in recommendations if r['priority'] == 'high')
        medium_priority = sum(1 for r in recommendations if r['priority'] == 'medium')
        
        # Score decreases with more urgent recommendations
        score = 100 - (high_priority * 15) - (medium_priority * 5)
        return max(0, min(100, score))
