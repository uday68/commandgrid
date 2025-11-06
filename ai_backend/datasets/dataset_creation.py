import random
import json
from datetime import datetime, timedelta, date
import uuid
from collections import defaultdict
import re
from sqlalchemy import create_engine, MetaData, inspect
from sqlalchemy.engine import URL
from sqlalchemy.dialects.postgresql import ENUM, UUID
from faker import Faker
class EnhancedSchemaProcessor:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.tables = defaultdict(dict)
        self.relationships = defaultdict(list)
        self.enum_values = defaultdict(list)
        self.uuid_columns = defaultdict(set)
        self.ignored_objects = set()
    def parse(self):
        try:
            engine = create_engine(self.database_url)
            metadata = MetaData()
            metadata.reflect(bind=engine)
            inspector = inspect(engine)
            for table_name in inspector.get_table_names():
                self._process_table(metadata.tables[table_name], inspector)
            print(f"Successfully parsed {len(self.tables)} tables")
            return self.tables, self.relationships, self.enum_values, self.uuid_columns
        except Exception as e:
            raise ValueError(f"Schema parsing failed: {str(e)}")
    def _process_table(self, table, inspector):
        try:
            table_name = table.name
            columns = []
            primary_keys = [col.name for col in table.primary_key.columns]
            foreign_keys = []
            constraints = []
            for column in table.columns:
                col_info = self._process_column(column, table_name)
                if col_info:
                    columns.append(col_info)
            for fk in table.foreign_key_constraints:
                fk_info = self._process_foreign_key(fk)
                if fk_info:
                    foreign_keys.append(fk_info)
            self.tables[table_name] = {'columns': columns, 'primary_keys': primary_keys, 'foreign_keys': foreign_keys, 'constraints': constraints}
        except Exception as e:
            print(f"Skipping table {table_name}: {str(e)}")
            self.ignored_objects.add(table_name)
    def _process_column(self, column, table_name):
        try:
            col_type = self._parse_data_type(column.type)
            constraints = []
            enum_vals = []
            is_primary = column.primary_key
            is_uuid = False
            if isinstance(column.type, UUID) or (column.default and 'uuid_generate_v4' in str(column.default)):
                is_uuid = True
                self.uuid_columns[table_name].add(column.name)
            if isinstance(column.type, ENUM):
                enum_vals = [e for e in column.type.enums]
                self.enum_values[(table_name, column.name)] = enum_vals
            return {'name': column.name, 'type': col_type, 'constraints': constraints, 'enum_values': enum_vals, 'is_primary': is_primary, 'is_uuid': is_uuid}
        except Exception as e:
            print(f"Skipping column {column.name}: {str(e)}")
            return None
    def _parse_data_type(self, data_type):
        if isinstance(data_type, ENUM):
            return 'ENUM'
        return str(data_type).split('(')[0].split(' ')[0].lower()
    def _process_foreign_key(self, fk_constraint):
        try:
            return {'local_column': fk_constraint.parent.name, 'foreign_table': fk_constraint.elements[0].column.table.name, 'foreign_column': fk_constraint.elements[0].column.name, 'on_delete': fk_constraint.ondelete or 'NO ACTION'}
        except Exception as e:
            print(f"Skipping foreign key: {str(e)}")
            return None
class EnhancedDatasetGenerator:
    def __init__(self, tables, relationships, enums, uuid_cols):
        self.tables = tables or {}
        self.relationships = relationships or defaultdict(list)
        self.enums = enums or defaultdict(list)
        self.uuid_cols = uuid_cols or defaultdict(set)
        self.faker = Faker()
        self.generated_uuids = defaultdict(dict)
        self.value_generators = self._init_value_generators()
        self.friendly_names = {}
        self.query_templates = self._init_query_templates()
        self._init_friendly_names()
    def _gen_enum_value(self, table, column):
        return random.choice(self.enums.get((table, column), []))
    def _init_value_generators(self):
        return {'uuid': lambda col: self._gen_uuid(col['table'], col['name']), 'serial': lambda _: random.randint(1, 10000), 'integer': lambda _: random.randint(1, 10000), 'varchar': self._gen_varchar, 'date': self._gen_date, 'timestamp': lambda _: datetime.now().isoformat(), 'boolean': lambda _: random.choice([True, False]), 'text': lambda _: self.faker.paragraph(), 'numeric': lambda _: round(random.uniform(1, 10000), 2), 'float': lambda _: round(random.uniform(1, 10000), 2), 'json': self._gen_json, 'email': lambda _: self.faker.email(), 'phone': lambda _: self.faker.phone_number()}
    def _init_friendly_names(self):
        special_plurals = {'ies': 'y', 'ses': 's', 'xes': 'x'}
        for table in self.tables:
            friendly = table.replace('_', ' ').title().replace('Tbl', '').replace('Table', '')
            for end, repl in special_plurals.items():
                if friendly.endswith(end):
                    friendly = friendly[:-len(end)] + repl
                    break
            self.friendly_names[table] = friendly
            for col in self.tables[table]['columns']:
                friendly_col = col['name'].replace('_', ' ').title().replace('Id', 'ID').replace('Fk', 'Related')
                self.friendly_names[col['name']] = friendly_col
    def _init_query_templates(self):
        return {'insert': ["Create a new {table} with {fields}", "Add a {table} record containing {fields}", "Register a {table} with {fields}"], 'select': ["Show me {fields} from {table}", "List all {fields} in {table}", "What {fields} do we have in {table}?"], 'filter': ["Find {table} where {condition}", "Search for {table} records that {condition}", "Locate {table} entries with {condition}"], 'join': ["Show {table1} together with their {table2}", "Combine {table1} records with related {table2}", "Display {table1} data along with associated {table2}"], 'aggregate': ["Calculate the {operation} of {field} in {table}", "What's the {operation} value for {field} in {table}?", "Determine the {operation} for {field} across all {table}"], 'update': ["Modify {table} records by setting {changes} where {condition}", "Update {table} entries to {changes} when {condition}"], 'delete': ["Remove {table} records matching {condition}", "Delete {table} entries where {condition}"]}
    def generate_dataset(self, num_samples=5000):
        dataset = []
        for table in self._valid_tables():
            dataset.extend(self._generate_crud_operations(table, 15))
        dataset.extend(self._generate_relationship_queries(3))
        dataset.extend(self._generate_advanced_operations(3))
        return self._post_process(dataset, num_samples)
    def _generate_crud_operations(self, table, samples):
        ops = []
        ops.extend(self._generate_inserts(table, samples * 2))
        ops.extend(self._generate_selects(table, samples * 3))
        ops.extend(self._generate_updates(table, samples))
        ops.extend(self._generate_deletes(table, samples // 2))
        return [op for op in ops if op]
    def _generate_inserts(self, table, samples):
        queries = []
        friendly_table = self.friendly_names[table]
        columns = [c for c in self.tables[table]['columns'] if not c.get('auto_increment', False)]
        for _ in range(samples):
            if not columns:
                continue
            selected_cols = random.sample(columns, random.randint(1, len(columns)))
            values = []
            for col in selected_cols:
                if col['name'] in self.relationships[table]:
                    fk = next(fk for fk in self.tables[table]['foreign_keys'] if fk['local_column'] == col['name'])
                    values.append(self._gen_foreign_key_value(fk))
                else:
                    values.append(self._generate_value(col, table))
            fields_nl = self._natural_join([self.friendly_names[col['name']] for col in selected_cols])
            fields_sql = [col['name'] for col in selected_cols]
            nl = random.choice(self.query_templates['insert']).format(table=friendly_table, fields=fields_nl.lower())
            sql = f"INSERT INTO {table} ({', '.join(fields_sql)}) VALUES ({', '.join(map(self._format_value, values))});"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_selects(self, table, samples):
        queries = []
        friendly_table = self.friendly_names[table]
        for _ in range(samples):
            cols = random.sample(self.tables[table]['columns'], random.randint(1, len(self.tables[table]['columns'])))
            fields_nl = self._natural_join([self.friendly_names[col['name']] for col in cols])
            fields_sql = [col['name'] for col in cols]
            nl = random.choice(self.query_templates['select']).format(table=friendly_table, fields=fields_nl.lower())
            sql = f"SELECT {', '.join(fields_sql)} FROM {table};"
            queries.append({'nl': nl, 'sql': sql})
        for _ in range(samples // 2):
            where_clause = self._generate_where_clause(table)
            nl = random.choice(self.query_templates['filter']).format(table=friendly_table, condition=self._nl_condition(where_clause))
            sql = f"SELECT * FROM {table} WHERE {where_clause};"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_updates(self, table, samples):
        queries = []
        friendly_table = self.friendly_names[table]
        updatable_cols = [c for c in self.tables[table]['columns'] if not c['is_primary'] and not c['is_uuid']]
        for _ in range(samples):
            if not updatable_cols:
                continue
            max_sample = min(3, len(updatable_cols))
            if max_sample < 1:
                continue
            sample_size = random.randint(1, max_sample)
            selected_cols = random.sample(updatable_cols, sample_size)
            set_clauses = []
            set_values = []
            for col in selected_cols:
                value = self._generate_value(col, table)
                set_clauses.append(f"{col['name']} = {self._format_value(value)}")
                set_values.append(f"{self.friendly_names[col['name']]} to {value}")
            where_clause = self._generate_where_clause(table)
            nl = random.choice(self.query_templates['update']).format(table=friendly_table, changes=self._natural_join(set_values), condition=self._nl_condition(where_clause))
            sql = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE {where_clause};"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_deletes(self, table, samples):
        queries = []
        friendly_table = self.friendly_names[table]
        for _ in range(samples):
            where_clause = self._generate_where_clause(table)
            nl = random.choice(self.query_templates['delete']).format(table=friendly_table, condition=self._nl_condition(where_clause))
            sql = f"DELETE FROM {table} WHERE {where_clause};"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_advanced_operations(self, multiplier=1):
        queries = []
        for _ in range(multiplier):
            queries.extend(self._generate_cte_queries())
            queries.extend(self._generate_window_function_queries())
            queries.extend(self._generate_json_queries())
            queries.extend(self._generate_full_text_search())
            queries.extend(self._generate_data_modification_cte())
        return queries
    def _generate_cte_queries(self):
        queries = []
        for table in self._valid_tables():
            if not self.relationships.get(table):
                continue
            related_table = self.relationships[table][0]['foreign_table']
            nl = f"Show {self.friendly_names[table]} with their {self.friendly_names[related_table]} using a temporary result set"
            sql = f"WITH related_data AS (SELECT t1.*, t2.name AS related_name FROM {table} t1 JOIN {related_table} t2 ON t1.{self.relationships[table][0]['local_column']} = t2.id) SELECT * FROM related_data;"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_window_function_queries(self):
        queries = []
        for table in self._valid_tables():
            numeric_cols = [c['name'] for c in self.tables[table]['columns'] if c['type'] in ('integer', 'numeric')]
            if not numeric_cols:
                continue
            col = random.choice(numeric_cols)
            nl = f"Show {self.friendly_names[table]} with running total of {self.friendly_names[col]}"
            sql = f"SELECT *, SUM({col}) OVER (ORDER BY {self.tables[table]['primary_keys'][0]}) FROM {table};"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_json_queries(self):
        queries = []
        for table in self._valid_tables():
            json_cols = [c for c in self.tables[table]['columns'] if c['type'] == 'json']
            if not json_cols:
                continue
            col = random.choice(json_cols)
            nl = f"Search {self.friendly_names[table]} where {self.friendly_names[col['name']]} contains specific values"
            sql = f"SELECT * FROM {table} WHERE {col['name']}->>'field' = 'value';"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _natural_join(self, items, connector='and'):
        if len(items) == 0:
            return ""
        if len(items) == 1:
            return items[0]
        return ", ".join(items[:-1]) + f" {connector} " + items[-1]
    def _format_value(self, value):
        if isinstance(value, str):
            return f"'{value.replace("'", "''")}'"
        if isinstance(value, bool):
            return 'TRUE' if value else 'FALSE'
        if isinstance(value, (datetime, date)):
            return f"'{value.isoformat()}'"
        if isinstance(value, (dict, list)):
            return f"'{json.dumps(value)}'"
        if value is None:
            return 'NULL'
        return str(value)
    def _generate_value(self, col, table):
        if col['is_uuid']:
            return self.value_generators['uuid']({'table': table, 'name': col['name']})
        if col['enum_values']:
            return random.choice(col['enum_values'])
        generator = self.value_generators.get(col['type'], lambda _: None)
        return generator(col)
    def _valid_tables(self):
        return [t for t in self.tables if len(self.tables[t]['columns']) > 0 and not t.startswith('_') and not t.startswith('temp_')]
    def _nl_condition(self, sql_condition):
        condition = sql_condition.lower()
        patterns = {r"(\w+) = '([^']+)'": "{col} is {value}", r"(\w+) > (\d+)": "{col} greater than {value}", r"(\w+) < (\d+)": "{col} less than {value}", r"(\w+) is null": "{col} is missing", r"(\w+) is not null": "{col} is present", r"(\w+) like '%([^%]+)%'": "{col} contains {value}", r"(\w+) between (\d+) and (\d+)": "{col} between {low} and {high}"}
        for pattern, template in patterns.items():
            match = re.match(pattern, condition)
            if match:
                groups = match.groups()
                col = self.friendly_names.get(groups[0], groups[0]).lower()
                return template.format(col=col, value=groups[1] if len(groups) > 1 else None, low=groups[1] if len(groups) > 2 else None, high=groups[2] if len(groups) > 2 else None)
        return f"matches condition: {sql_condition}"
    def _generate_where_clause(self, table):
        columns = self.tables[table]['columns']
        num_conditions = random.choice([1, 1, 2])
        conditions = []
        for _ in range(num_conditions):
            col = random.choice(columns)
            col_name = col['name']
            if col['enum_values']:
                val = random.choice(col['enum_values'])
                conditions.append(f"{col_name} = '{val}'")
            elif col['type'] == 'boolean':
                val = random.choice([True, False])
                conditions.append(f"{col_name} = {val}")
            elif col['type'] in ('integer', 'numeric'):
                op = random.choice(['>', '<', '=', '!=', 'BETWEEN'])
                if op == 'BETWEEN':
                    low = self._generate_value(col, table)
                    high = low + random.randint(1, 100)
                    conditions.append(f"{col_name} BETWEEN {low} AND {high}")
                else:
                    val = self._generate_value(col, table)
                    conditions.append(f"{col_name} {op} {val}")
            else:
                val = self._generate_value(col, table)
                conditions.append(f"{col_name} = {self._format_value(val)}")
        return self._natural_join(conditions, 'AND')
    def _gen_uuid(self, table, column_name):
        if column_name not in self.generated_uuids[table]:
            self.generated_uuids[table][column_name] = str(uuid.uuid4())
        return self.generated_uuids[table][column_name]
    def _generate_full_text_search(self):
        queries = []
        for table in self._valid_tables():
            text_cols = [c['name'] for c in self.tables[table]['columns'] if c['type'] in ('text', 'varchar')]
            if not text_cols:
                continue
            col = random.choice(text_cols)
            nl = f"Search {self.friendly_names[table]} for entries containing 'important' in {self.friendly_names[col]}"
            sql = f"SELECT * FROM {table} WHERE to_tsvector('english', {col}) @@ to_tsquery('english', 'important');"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_relationship_queries(self, multiplier=1):
        queries = []
        for table in self.tables:
            for rel in self.relationships.get(table, []):
                if self._is_many_to_many(rel['foreign_table']):
                    queries.extend(self._generate_many_to_many_query(table, rel))
                else:
                    queries.extend(self._generate_join_queries(table, rel))
        return queries
    def _is_many_to_many(self, table):
        cols = [c['name'] for c in self.tables[table]['columns']]
        return len(cols) == 2 and all(c.endswith('_id') for c in cols) and len(self.tables[table]['foreign_keys']) == 2
    def _generate_many_to_many_query(self, table, rel):
        queries = []
        table1 = rel['foreign_table']
        table2 = [fk['foreign_table'] for fk in self.tables[table]['foreign_keys'] if fk['foreign_table'] != table1][0]
        nl = f"Show {self.friendly_names[table1]} with their associated {self.friendly_names[table2]}"
        sql = f"SELECT t1.*, t3.* FROM {table1} t1 JOIN {table} t2 ON t1.id = t2.{table1}_id JOIN {table2} t3 ON t2.{table2}_id = t3.id;"
        queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_join_queries(self, table, rel):
        joins = ['INNER', 'LEFT', 'RIGHT', 'FULL']
        queries = []
        for join_type in joins:
            nl = f"{join_type.title()} join between {self.friendly_names[table]} and {self.friendly_names[rel['foreign_table']]}"
            sql = f"SELECT * FROM {table} {join_type} JOIN {rel['foreign_table']} ON {table}.{rel['local_column']} = {rel['foreign_table']}.{rel['foreign_column']};"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _generate_data_modification_cte(self):
        queries = []
        for table in self._valid_tables():
            nl = f"Insert new records into {self.friendly_names[table]} using a CTE"
            sql = f"WITH new_data AS (INSERT INTO {table} (name, email) VALUES ('New User', 'user@example.com') RETURNING *) SELECT * FROM new_data;"
            queries.append({'nl': nl, 'sql': sql})
        return queries
    def _gen_varchar(self, col):
        col_name = col['name'].lower()
        if 'email' in col_name:
            return self.faker.email()
        if 'phone' in col_name:
            return self.faker.phone_number()
        if 'name' in col_name:
            return self.faker.name()
        if 'address' in col_name:
            return self.faker.address()
        return self.faker.word()
    def _gen_date(self, col=None):
        if col and 'created' in col['name'].lower():
            return self.faker.past_date().isoformat()
        if col and 'updated' in col['name'].lower():
            return self.faker.recent_date().isoformat()
        return self.faker.date_this_decade().isoformat()
    def _gen_json(self, col=None):
        return json.dumps({'id': str(uuid.uuid4()), 'timestamp': datetime.now().isoformat(), 'value': random.choice(['active', 'pending', 'completed'])})
    def _gen_foreign_key_value(self, fk_info):
        related_table = fk_info['foreign_table']
        return self.generated_uuids[related_table].get(fk_info['foreign_column'], str(uuid.uuid4()))
    def _post_process(self, dataset, num_samples):
        unique_queries = {q['sql']: q for q in dataset}
        query_types = defaultdict(list)
        for q in unique_queries.values():
            query_types[self._detect_query_type(q['sql'])].append(q)
        sampled = []
        for q_type, target in {'select': 1500, 'insert': 1000, 'update': 800, 'delete': 400, 'join': 600, 'filter': 500, 'aggregate': 200, 'cte': 300, 'advanced': 300}.items():
            available = [q for q in query_types.get(q_type, []) if q_type in q['sql']]
            count = min(target, len(available))
            sampled.extend(random.sample(available, count) if available else [])
        remaining = num_samples - len(sampled)
        if remaining > 0:
            extra = random.sample([q for q in unique_queries.values() if q not in sampled], remaining)
            sampled.extend(extra)
        return sampled[:num_samples]
    def _detect_query_type(self, sql):
        sql = sql.lower()
        if 'insert' in sql: return 'insert'
        if 'update' in sql: return 'update'
        if 'delete' in sql: return 'delete'
        if 'join' in sql: return 'join'
        if 'where' in sql: return 'filter'
        if any(op in sql for op in ['sum(', 'avg(', 'count(']): return 'aggregate'
        if 'with ' in sql: return 'cte'
        return 'select'
def generate_dataset(db_url, output_file="5000_dataset.json"):
    try:
        processor = EnhancedSchemaProcessor(db_url)
        tables, relationships, enums, uuid_cols = processor.parse()
        if not tables:
            raise ValueError("No tables parsed. Potential issues:\n1. Invalid database connection\n2. No tables in database\n3. Connection permissions")
        generator = EnhancedDatasetGenerator(tables, relationships, enums, uuid_cols)
        dataset = generator.generate_dataset()
        with open(output_file, 'w') as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)
        print(f"Successfully generated {len(dataset)} NL/SQL pairs")
        print(f"Output saved to {output_file}")
    except Exception as e:
        print(f"Generation failed: {str(e)}")
if __name__ == "__main__":
    db_url = URL.create(drivername="postgresql", username="postgres", password="newpassword", host="localhost", database="pmt", port=5433)
    generate_dataset(db_url, "5000_dataset.json")