package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ecommerce.entity.TOrders;
import com.ecommerce.mapper.TOrdersMapper;
import com.ecommerce.service.TOrdersService;
import org.springframework.stereotype.Service;

@Service
public class TOrdersServiceImpl extends ServiceImpl<TOrdersMapper, TOrders> implements TOrdersService {

}
