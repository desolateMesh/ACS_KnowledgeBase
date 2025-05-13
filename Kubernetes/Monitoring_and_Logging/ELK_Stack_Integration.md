# ELK Stack Integration with Kubernetes

## Overview

The ELK Stack (Elasticsearch, Logstash, and Kibana) is a powerful platform for managing, analyzing, and visualizing logs from Kubernetes clusters. This guide provides comprehensive instructions for integrating ELK Stack with Kubernetes, enabling effective monitoring, troubleshooting, and observability.

## Architecture Components

### 1. Elasticsearch
Elasticsearch serves as the distributed search and analytics engine that stores and indexes log data from the Kubernetes cluster.

**Key Features:**
- Distributed architecture for high availability
- RESTful API for data ingestion and querying
- Full-text search capabilities
- Real-time data indexing
- Horizontal scalability

### 2. Logstash
Logstash acts as the data processing pipeline that collects, transforms, and forwards logs to Elasticsearch.

**Key Features:**
- Multiple input sources support
- Data transformation and enrichment
- Plugin architecture for extensibility
- Buffer management for reliability
- Multi-format output capabilities

### 3. Kibana
Kibana provides the visualization layer for exploring and analyzing data stored in Elasticsearch.

**Key Features:**
- Interactive dashboards and visualizations
- Real-time monitoring capabilities
- Advanced search and filter options
- Machine learning integration
- Alerting and notification systems

### 4. Beats (Filebeat/Metricbeat)
Lightweight data shippers that collect logs and metrics from Kubernetes nodes and pods.

**Key Features:**
- Minimal resource footprint
- Auto-discovery of Kubernetes resources
- Built-in modules for common applications
- Reliable delivery with acknowledgments
- Kubernetes-aware metadata enrichment

## Deployment Architecture Patterns

### Pattern 1: DaemonSet-Based Log Collection

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: kube-logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.12.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: ELASTICSEARCH_HOST
          value: elasticsearch.kube-logging.svc.cluster.local
        - name: ELASTICSEARCH_PORT
          value: "9200"
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: containers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: dockersock
          mountPath: /var/run/docker.sock
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0640
          name: filebeat-config
      - name: containers
        hostPath:
          path: /var/lib/docker/containers
      - name: dockersock
        hostPath:
          path: /var/run/docker.sock
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate
```

**Rationale:** DaemonSet ensures one Filebeat pod runs on each node, providing comprehensive log collection across the cluster.

### Pattern 2: Sidecar Container Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-with-logging
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: application
        image: myapp:1.0
        volumeMounts:
        - name: log-volume
          mountPath: /var/log/app
      - name: filebeat-sidecar
        image: docker.elastic.co/beats/filebeat:8.12.0
        volumeMounts:
        - name: log-volume
          mountPath: /var/log/app
        - name: filebeat-config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
      volumes:
      - name: log-volume
        emptyDir: {}
      - name: filebeat-config
        configMap:
          name: filebeat-sidecar-config
```

**Rationale:** Sidecar pattern provides dedicated log collection for specific applications with custom requirements.

## Elasticsearch Deployment Configuration

### High Availability Setup

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch-cluster
  namespace: kube-logging
spec:
  version: 8.12.0
  nodeSets:
  - name: masters
    count: 3
    config:
      node.roles: ["master"]
      xpack.security.enabled: true
      xpack.security.transport.ssl.enabled: true
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
        storageClassName: fast-ssd
  - name: data
    count: 5
    config:
      node.roles: ["data", "ingest"]
      xpack.security.enabled: true
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
  http:
    tls:
      selfSignedCertificate:
        disabled: false
```

**Best Practices:**
- Separate master and data nodes for stability
- Use persistent volumes for data retention
- Enable security features for production
- Configure appropriate resource limits
- Implement proper backup strategies

## Filebeat Configuration

### Comprehensive Filebeat Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: kube-logging
data:
  filebeat.yml: |-
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
        - drop_event:
            when:
              or:
              - equals:
                  kubernetes.namespace: "kube-system"
              - equals:
                  kubernetes.namespace: "kube-logging"
        - decode_json_fields:
            fields: ["message"]
            target: "json"
            overwrite_keys: true
            max_depth: 2
        - add_fields:
            target: ''
            fields:
              cluster.name: production-cluster
              environment: production
    
    filebeat.autodiscover:
      providers:
        - type: kubernetes
          host: ${NODE_NAME}
          hints.enabled: true
          hints.default_config:
            type: container
            paths:
              - /var/log/containers/*${data.kubernetes.container.id}.log
          templates:
            - condition:
                contains:
                  kubernetes.labels.app: "nginx"
              config:
                - type: container
                  paths:
                    - /var/log/containers/*${data.kubernetes.container.id}.log
                  processors:
                    - dissect:
                        tokenizer: '%{client_ip} - - [%{timestamp}] "%{method} %{uri} %{protocol}" %{status} %{size}'
                        field: "message"
                        target_prefix: "nginx"
    
    processors:
      - add_cloud_metadata:
      - add_docker_metadata:
      - add_kubernetes_metadata:
          in_cluster: true
      - add_host_metadata:
          netinfo.enabled: true
    
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}']
      protocol: "https"
      username: "elastic"
      password: "${ELASTICSEARCH_PASSWORD}"
      ssl.certificate_authorities: ["/etc/filebeat/certs/ca.crt"]
      index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"
      template.enabled: true
      template.settings:
        index.number_of_shards: 3
        index.number_of_replicas: 1
      ilm.enabled: true
      ilm.rollover_alias: "filebeat"
      ilm.pattern: "{now/d}-000001"
    
    logging.level: info
    logging.to_files: true
    logging.files:
      path: /var/log/filebeat
      name: filebeat
      keepfiles: 7
      permissions: 0640
```

**Key Configuration Insights:**
- Auto-discovery enables dynamic pod monitoring
- Kubernetes metadata enrichment for better context
- Conditional processing based on labels
- Index lifecycle management for data retention
- Security configuration with TLS

## Logstash Pipeline Configuration

### Advanced Pipeline Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logstash-pipeline
  namespace: kube-logging
data:
  logstash.conf: |
    input {
      beats {
        port => 5044
        ssl => true
        ssl_certificate => "/etc/logstash/certs/server.crt"
        ssl_key => "/etc/logstash/certs/server.key"
      }
    }
    
    filter {
      # Parse Kubernetes metadata
      if [kubernetes] {
        mutate {
          add_field => {
            "app_name" => "%{[kubernetes][labels][app]}"
            "namespace" => "%{[kubernetes][namespace]}"
            "pod_name" => "%{[kubernetes][pod][name]}"
            "container_name" => "%{[kubernetes][container][name]}"
          }
        }
      }
      
      # Parse Java stack traces
      if [app_name] == "java-app" {
        multiline {
          pattern => "^\s"
          what => "previous"
        }
        grok {
          match => {
            "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{JAVACLASS:class} - %{GREEDYDATA:log_message}"
          }
        }
      }
      
      # Parse nginx access logs
      if [app_name] == "nginx" {
        grok {
          match => {
            "message" => '%{IPORHOST:remote_ip} - %{DATA:user_name} \[%{HTTPDATE:access_time}\] "%{WORD:http_method} %{DATA:url} HTTP/%{NUMBER:http_version}" %{NUMBER:response_code} %{NUMBER:body_sent_bytes} "%{DATA:referrer}" "%{DATA:user_agent}"'
          }
        }
        
        date {
          match => [ "access_time", "dd/MMM/yyyy:HH:mm:ss Z" ]
          target => "@timestamp"
        }
        
        geoip {
          source => "remote_ip"
          target => "geo"
        }
      }
      
      # Add environment metadata
      mutate {
        add_field => {
          "environment" => "${ENVIRONMENT:development}"
          "datacenter" => "${DATACENTER:us-west-2}"
          "cluster_name" => "${CLUSTER_NAME:kubernetes}"
        }
      }
      
      # Remove unnecessary fields
      mutate {
        remove_field => [ "host", "agent", "ecs", "input", "log" ]
      }
    }
    
    output {
      elasticsearch {
        hosts => ["${ELASTICSEARCH_HOSTS}"]
        ssl => true
        ssl_certificate_verification => true
        cacert => "/etc/logstash/certs/ca.crt"
        user => "${ELASTICSEARCH_USER}"
        password => "${ELASTICSEARCH_PASSWORD}"
        
        index => "kubernetes-%{[app_name]}-%{+YYYY.MM.dd}"
        
        template_name => "kubernetes-logs"
        template => "/etc/logstash/templates/kubernetes-template.json"
        template_overwrite => true
      }
      
      # Send critical errors to monitoring system
      if [level] == "ERROR" or [level] == "CRITICAL" {
        http {
          url => "${ALERT_WEBHOOK_URL}"
          http_method => "post"
          format => "json"
          mapping => {
            "text" => "Critical error in %{[app_name]}: %{[message]}"
            "severity" => "%{[level]}"
            "namespace" => "%{[namespace]}"
            "pod" => "%{[pod_name]}"
          }
        }
      }
    }
```

**Pipeline Design Rationale:**
- Multi-format log parsing for different applications
- Conditional processing based on application type
- GeoIP enrichment for access logs
- Alert integration for critical errors
- Optimized index naming strategy

## Kibana Dashboard Configuration

### Essential Dashboard Components

```json
{
  "version": "8.12.0",
  "objects": [
    {
      "id": "kubernetes-overview-dashboard",
      "type": "dashboard",
      "attributes": {
        "title": "Kubernetes Cluster Overview",
        "panels": [
          {
            "version": "8.12.0",
            "type": "visualization",
            "panelConfig": {
              "title": "Log Volume by Namespace",
              "type": "line",
              "params": {
                "aggregation": "count",
                "split_by": "namespace",
                "time_field": "@timestamp"
              }
            }
          },
          {
            "version": "8.12.0",
            "type": "visualization",
            "panelConfig": {
              "title": "Error Rate by Application",
              "type": "bar",
              "params": {
                "aggregation": "percentage",
                "filter": "level:ERROR OR level:CRITICAL",
                "split_by": "app_name"
              }
            }
          },
          {
            "version": "8.12.0",
            "type": "lens",
            "panelConfig": {
              "title": "Container Restart Patterns",
              "layers": [
                {
                  "type": "xy",
                  "metrics": ["container_restart_count"],
                  "breakdown": "pod_name",
                  "time_field": "@timestamp"
                }
              ]
            }
          },
          {
            "version": "8.12.0",
            "type": "map",
            "panelConfig": {
              "title": "Geographic Request Distribution",
              "layer": {
                "type": "geo_point",
                "field": "geo.location",
                "metric": "count"
              }
            }
          }
        ]
      }
    }
  ]
}
```

**Dashboard Best Practices:**
- Focus on actionable metrics
- Include both overview and detailed views
- Implement proper time filtering
- Use color coding for severity levels
- Include geographic visualizations when relevant

## Security Configuration

### RBAC Configuration for ELK Components

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: filebeat
  namespace: kube-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: filebeat
rules:
- apiGroups: [""]
  resources:
  - namespaces
  - pods
  - nodes
  - persistentvolumes
  - persistentvolumeclaims
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources:
  - replicasets
  - statefulsets
  - deployments
  - daemonsets
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources:
  - jobs
  - cronjobs
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: filebeat
subjects:
- kind: ServiceAccount
  name: filebeat
  namespace: kube-logging
roleRef:
  kind: ClusterRole
  name: filebeat
  apiGroup: rbac.authorization.k8s.io
```

### Elasticsearch Security Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: elasticsearch-credentials
  namespace: kube-logging
type: Opaque
data:
  username: ZWxhc3RpYw==  # base64 encoded
  password: <base64-encoded-strong-password>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-security
  namespace: kube-logging
data:
  elasticsearch.yml: |
    xpack.security.enabled: true
    xpack.security.transport.ssl.enabled: true
    xpack.security.transport.ssl.verification_mode: certificate
    xpack.security.transport.ssl.client_authentication: required
    xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
    xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
    
    xpack.security.http.ssl.enabled: true
    xpack.security.http.ssl.keystore.path: elastic-certificates.p12
    xpack.security.http.ssl.truststore.path: elastic-certificates.p12
    
    xpack.security.authc.api_key.enabled: true
    xpack.security.audit.enabled: true
    xpack.security.audit.outputs: [ index, logfile ]
    
    # Role mapping for Kubernetes service accounts
    xpack.security.authc.realms.native.native1:
      order: 0
    xpack.security.authc.realms.pki.pki1:
      order: 1
      certificate_authorities: [ "ca.crt" ]
```

**Security Best Practices:**
- Enable TLS for all communications
- Use RBAC for fine-grained access control
- Implement certificate-based authentication
- Enable audit logging
- Rotate credentials regularly
- Use secrets management for credentials

## Performance Optimization Strategies

### Elasticsearch Performance Tuning

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-performance
  namespace: kube-logging
data:
  jvm.options: |
    -Xms4g
    -Xmx4g
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=200
    -XX:InitiatingHeapOccupancyPercent=75
    -XX:+HeapDumpOnOutOfMemoryError
    -XX:HeapDumpPath=/usr/share/elasticsearch/data
    -XX:ErrorFile=/usr/share/elasticsearch/logs/hs_err_pid%p.log
    -Xlog:gc*,gc+age=trace,safepoint:file=/usr/share/elasticsearch/logs/gc.log:utctime,pid,tags:filecount=32,filesize=64m
  elasticsearch.yml: |
    # Threading and queueing
    thread_pool:
      write:
        size: 8
        queue_size: 1000
      search:
        size: 12
        queue_size: 1000
    
    # Indexing performance
    indices:
      memory:
        index_buffer_size: 20%
        min_index_buffer_size: 96mb
      refresh_interval: 30s
      translog:
        sync_interval: 30s
        durability: async
    
    # Search performance
    search:
      default_search_timeout: 30s
      max_buckets: 10000
    
    # Circuit breakers
    indices.breaker.total.use_real_memory: false
    indices.breaker.total.limit: 85%
    indices.breaker.fielddata.limit: 40%
    indices.breaker.request.limit: 40%
```

### Filebeat Performance Optimization

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-performance
  namespace: kube-logging
data:
  filebeat.yml: |
    # Output configuration
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
      worker: 2
      bulk_max_size: 2048
      compression_level: 0
      flush_interval: 5s
    
    # Memory queue settings
    queue.mem:
      events: 4096
      flush.min_events: 2048
      flush.timeout: 5s
    
    # Harvester limits
    filebeat.inputs:
    - type: log
      harvester_buffer_size: 65536
      max_bytes: 10485760
      close_inactive: 5m
      close_removed: true
      close_renamed: true
      clean_removed: true
      scan_frequency: 10s
      ignore_older: 24h
    
    # Processor limits
    processors:
      - rate_limit:
          limit: "10000/m"
      - drop_fields:
          fields: ["agent.ephemeral_id", "agent.hostname", "agent.id"]
          ignore_missing: true
```

**Performance Rationale:**
- Optimized JVM settings for Elasticsearch
- Bulk processing for better throughput
- Memory queue configuration for buffering
- Harvester limits to prevent resource exhaustion
- Field dropping to reduce data volume

## Monitoring and Alerting

### Elasticsearch Monitoring Stack

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metricbeat-config
  namespace: kube-logging
data:
  metricbeat.yml: |
    metricbeat.modules:
    - module: elasticsearch
      metricsets:
        - node
        - cluster
        - index
        - shard
        - ml_job
      period: 10s
      hosts: ["elasticsearch:9200"]
      ssl.certificate_authorities: ["/etc/metricbeat/certs/ca.crt"]
      username: "monitoring_user"
      password: "${MONITORING_PASSWORD}"
    
    - module: kibana
      metricsets:
        - stats
        - status
      period: 10s
      hosts: ["kibana:5601"]
      ssl.certificate_authorities: ["/etc/metricbeat/certs/ca.crt"]
      username: "monitoring_user"
      password: "${MONITORING_PASSWORD}"
    
    - module: logstash
      metricsets:
        - node
        - node_stats
      period: 10s
      hosts: ["logstash:9600"]
    
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
      ssl.certificate_authorities: ["/etc/metricbeat/certs/ca.crt"]
      username: "monitoring_user"
      password: "${MONITORING_PASSWORD}"
      index: "metricbeat-%{[agent.version]}-%{+yyyy.MM.dd}"
```

### Alert Rules Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: watcher-alerts
  namespace: kube-logging
data:
  cluster_health_alert.json: |
    {
      "trigger": {
        "schedule": {
          "interval": "1m"
        }
      },
      "input": {
        "http": {
          "request": {
            "host": "elasticsearch",
            "port": 9200,
            "path": "/_cluster/health",
            "scheme": "https"
          }
        }
      },
      "condition": {
        "compare": {
          "ctx.payload.status": {
            "not_eq": "green"
          }
        }
      },
      "actions": {
        "send_alert": {
          "webhook": {
            "scheme": "https",
            "host": "alerts.company.com",
            "port": 443,
            "method": "post",
            "path": "/webhook/elasticsearch",
            "body": {
              "alert": "Elasticsearch cluster health is {{ctx.payload.status}}",
              "cluster": "{{ctx.payload.cluster_name}}",
              "severity": "high",
              "timestamp": "{{ctx.execution_time}}"
            }
          }
        }
      }
    }
  disk_usage_alert.json: |
    {
      "trigger": {
        "schedule": {
          "interval": "5m"
        }
      },
      "input": {
        "search": {
          "request": {
            "search_type": "query_then_fetch",
            "indices": ["metricbeat-*"],
            "body": {
              "size": 0,
              "query": {
                "bool": {
                  "filter": [
                    {
                      "range": {
                        "@timestamp": {
                          "gte": "now-5m"
                        }
                      }
                    },
                    {
                      "term": {
                        "metricset.name": "node"
                      }
                    }
                  ]
                }
              },
              "aggs": {
                "nodes": {
                  "terms": {
                    "field": "elasticsearch.node.name",
                    "size": 100
                  },
                  "aggs": {
                    "disk_usage": {
                      "max": {
                        "field": "elasticsearch.node.stats.fs.total.available_in_bytes"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "condition": {
        "script": {
          "source": """
            def threshold = 0.85;
            for (node in ctx.payload.aggregations.nodes.buckets) {
              def used_ratio = 1 - (node.disk_usage.value / node.total_disk.value);
              if (used_ratio > threshold) {
                return true;
              }
            }
            return false;
          """
        }
      },
      "actions": {
        "send_alert": {
          "webhook": {
            "scheme": "https",
            "host": "alerts.company.com",
            "port": 443,
            "method": "post",
            "path": "/webhook/elasticsearch",
            "body": {
              "alert": "High disk usage detected on Elasticsearch nodes",
              "severity": "high",
              "threshold": "85%",
              "timestamp": "{{ctx.execution_time}}"
            }
          }
        }
      }
    }
```

**Monitoring Best Practices:**
- Monitor cluster health continuously
- Track disk usage and memory consumption
- Alert on indexing/search latency
- Monitor JVM heap usage
- Track network connectivity issues
- Implement escalation procedures

## Index Lifecycle Management

### ILM Policy Configuration

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "7d",
            "max_docs": 50000000
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": {
            "number_of_replicas": 1,
            "require": {
              "node_type": "warm"
            }
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0,
            "require": {
              "node_type": "cold"
            }
          },
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### Index Template Configuration

```json
{
  "index_patterns": ["kubernetes-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "kubernetes-logs-policy",
      "index.lifecycle.rollover_alias": "kubernetes-logs",
      "index.routing.allocation.require.node_type": "hot",
      "index.codec": "best_compression",
      "index.refresh_interval": "30s",
      "index.translog.durability": "async",
      "index.translog.sync_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "kubernetes": {
          "properties": {
            "namespace": {
              "type": "keyword"
            },
            "pod": {
              "properties": {
                "name": {
                  "type": "keyword"
                },
                "uid": {
                  "type": "keyword"
                }
              }
            },
            "container": {
              "properties": {
                "name": {
                  "type": "keyword"
                },
                "image": {
                  "type": "keyword"
                }
              }
            },
            "labels": {
              "type": "object",
              "enabled": false
            },
            "annotations": {
              "type": "object",
              "enabled": false
            }
          }
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "level": {
          "type": "keyword"
        },
        "app_name": {
          "type": "keyword"
        }
      }
    }
  },
  "composed_of": ["kubernetes-common-settings"],
  "priority": 500,
  "version": 1,
  "_meta": {
    "description": "Template for Kubernetes logs with ILM"
  }
}
```

**ILM Best Practices:**
- Define clear retention policies
- Use tiered storage for cost optimization
- Implement proper rollover strategies
- Monitor disk usage trends
- Archive data before deletion
- Test restoration procedures regularly

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Memory Usage in Elasticsearch

**Symptoms:**
- OutOfMemoryErrors in logs
- Slow query performance
- Node disconnections

**Solution:**
```yaml
# Adjust JVM heap size
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-jvm-options
data:
  jvm.options: |
    -Xms8g
    -Xmx8g
    -XX:+UseG1GC
    -XX:G1ReservePercent=25
    -XX:InitiatingHeapOccupancyPercent=30
```

**Monitoring Query:**
```json
GET /_nodes/stats/jvm?human=true
```

#### 2. Filebeat Not Collecting Logs

**Symptoms:**
- No new logs in Elasticsearch
- Filebeat pods in error state

**Debugging Steps:**
```bash
# Check Filebeat logs
kubectl logs -n kube-logging filebeat-xxx -f

# Verify permissions
kubectl get clusterrolebinding filebeat -o yaml

# Test Elasticsearch connectivity
kubectl exec -n kube-logging filebeat-xxx -- curl -k https://elasticsearch:9200
```

**Common Fixes:**
- Update RBAC permissions
- Fix certificate issues
- Verify Elasticsearch connectivity

#### 3. Logstash Pipeline Failures

**Symptoms:**
- Messages stuck in queue
- High CPU usage
- Parse failures

**Debugging Configuration:**
```ruby
filter {
  # Add debugging output
  mutate {
    add_tag => [ "debug" ]
  }
  
  # Catch parsing errors
  if "_grokparsefailure" in [tags] {
    mutate {
      add_field => {
        "parse_error" => "true"
        "original_message" => "%{message}"
      }
    }
  }
  
  # Log to separate index for debugging
  if "debug" in [tags] {
    clone {
      clones => ["debug"]
      add_tag => [ "cloned" ]
    }
  }
}
```

#### 4. Index Performance Issues

**Symptoms:**
- Slow indexing rate
- High indexing latency
- Bulk rejections

**Performance Analysis:**
```json
GET /_cat/thread_pool/write?v&h=node_name,name,active,rejected,completed

GET /_nodes/stats/indices?human=true

GET /_cluster/pending_tasks
```

**Optimization Steps:**
1. Increase bulk size
2. Adjust refresh interval
3. Optimize mappings
4. Scale data nodes

### Diagnostic Commands

```bash
# Check cluster health
curl -X GET "https://elasticsearch:9200/_cluster/health?pretty"

# View node statistics
curl -X GET "https://elasticsearch:9200/_nodes/stats?pretty"

# Check index patterns
curl -X GET "https://elasticsearch:9200/_cat/indices?v"

# Verify Filebeat connectivity
kubectl exec -n kube-logging filebeat-xxx -- filebeat test output

# Test Logstash configuration
kubectl exec -n kube-logging logstash-xxx -- logstash -t -f /etc/logstash/pipeline/logstash.conf

# Check Kibana status
curl -X GET "https://kibana:5601/api/status"
```

## Backup and Recovery Procedures

### Snapshot Repository Configuration

```json
PUT /_snapshot/kubernetes-backups
{
  "type": "s3",
  "settings": {
    "bucket": "elasticsearch-backups",
    "region": "us-west-2",
    "base_path": "kubernetes-cluster",
    "compress": true,
    "chunk_size": "1gb",
    "max_restore_bytes_per_sec": "40mb",
    "max_snapshot_bytes_per_sec": "40mb"
  }
}
```

### Automated Backup Policy

```json
PUT /_slm/policy/daily-snapshots
{
  "schedule": "0 30 2 * * ?",
  "name": "<daily-snap-{now/d}>",
  "repository": "kubernetes-backups",
  "config": {
    "indices": ["kubernetes-logs-*", "filebeat-*", "metricbeat-*"],
    "ignore_unavailable": true,
    "include_global_state": false,
    "partial": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 31
  }
}
```

### Recovery Procedures

```bash
# List available snapshots
GET /_snapshot/kubernetes-backups/_all

# Restore specific indices
POST /_snapshot/kubernetes-backups/daily-snap-2024-01-15/_restore
{
  "indices": "kubernetes-logs-*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "rename_pattern": "(.+)",
  "rename_replacement": "restored-$1",
  "include_aliases": false
}

# Monitor restore progress
GET /_cat/recovery?v&active_only=true
```

## Migration Strategies

### Version Upgrade Path

1. **Pre-upgrade Checklist:**
   - Backup all data
   - Review breaking changes
   - Test in staging environment
   - Update client libraries
   - Plan maintenance window

2. **Rolling Upgrade Process:**
   ```yaml
   # Update Elasticsearch nodes one by one
   kubectl set image statefulset/elasticsearch \
     elasticsearch=docker.elastic.co/elasticsearch/elasticsearch:8.12.0 \
     -n kube-logging
   
   # Wait for cluster to stabilize
   kubectl rollout status statefulset/elasticsearch -n kube-logging
   
   # Repeat for other components
   kubectl set image daemonset/filebeat \
     filebeat=docker.elastic.co/beats/filebeat:8.12.0 \
     -n kube-logging
   ```

3. **Post-upgrade Validation:**
   - Verify cluster health
   - Check data integrity
   - Test search functionality
   - Validate dashboards
   - Monitor performance metrics

## Cost Optimization Strategies

### Storage Tiering

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: elasticsearch-hot
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iopsPerGB: "10"
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: elasticsearch-warm
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: elasticsearch-cold
provisioner: kubernetes.io/aws-ebs
parameters:
  type: sc1
```

### Resource Optimization

```yaml
# CPU and Memory limits
resources:
  requests:
    memory: "4Gi"
    cpu: "2"
  limits:
    memory: "8Gi"
    cpu: "4"

# JVM heap configuration
env:
- name: ES_JAVA_OPTS
  value: "-Xms4g -Xmx4g"

# Horizontal Pod Autoscaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: elasticsearch-data-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: elasticsearch-data
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Integration with Other Tools

### Prometheus Integration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-elasticsearch-exporter
data:
  elasticsearch_exporter.yml: |
    es:
      all: true
      indices: true
      cluster_health: true
      snapshots: true
      tasks: true
      nodes: true
      indices_settings: true
      shards: true
      exclude_nodes: ["_local"]
    
    metrics:
      cluster_health:
        enabled: true
      nodes:
        enabled: true
      indices:
        enabled: true
        include:
          - "kubernetes-logs-*"
          - "filebeat-*"
          - "metricbeat-*"
```

### Grafana Dashboard Integration

```json
{
  "dashboard": {
    "title": "ELK Stack Monitoring",
    "panels": [
      {
        "title": "Elasticsearch Cluster Health",
        "targets": [
          {
            "expr": "elasticsearch_cluster_health_status{cluster=\"$cluster\"}"
          }
        ]
      },
      {
        "title": "Index Rate",
        "targets": [
          {
            "expr": "rate(elasticsearch_indices_indexing_index_total{cluster=\"$cluster\"}[5m])"
          }
        ]
      },
      {
        "title": "Search Latency",
        "targets": [
          {
            "expr": "elasticsearch_indices_search_query_time_seconds{cluster=\"$cluster\"} / elasticsearch_indices_search_query_total{cluster=\"$cluster\"}"
          }
        ]
      }
    ]
  }
}
```

## Conclusion

This comprehensive guide provides a robust foundation for integrating ELK Stack with Kubernetes. The configurations and best practices outlined here enable AI agents to make informed decisions and create effective monitoring solutions. Regular reviews and updates of these configurations ensure optimal performance and security of the logging infrastructure.

Remember to:
- Regularly update components to latest stable versions
- Monitor performance metrics continuously
- Implement proper backup strategies
- Follow security best practices
- Optimize resource usage based on workload
- Document custom configurations and procedures

For additional resources, refer to:
- [Elastic Cloud on Kubernetes Documentation](https://www.elastic.co/guide/en/cloud-on-k8s/current/index.html)
- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Elastic Stack Best Practices](https://www.elastic.co/guide/en/elasticsearch/reference/current/best-practices.html)
