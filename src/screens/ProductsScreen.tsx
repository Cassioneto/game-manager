import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { Product } from '../types';
import { 
  getProductsFromDb, 
  insertProductInDb, 
  updateProductStockInDb, 
  insertSaleInDb, 
  insertCashMovementInDb 
} from '../database/queries';

export default function ProductsScreen() {
  const openCashRegister = useStore((state) => state.openCashRegister);

  const [products, setProducts] = useState<Product[]>([]);
  
  // New Product Form
  const [newNome, setNewNome] = useState('');
  const [newCategoria, setNewCategoria] = useState('');
  const [newPreco, setNewPreco] = useState('');
  const [newEstoque, setNewEstoque] = useState('');
  const [newEstoqueMin, setNewEstoqueMin] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Sale Quantity Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellQty, setSellQty] = useState('1');

  const loadProducts = () => {
    try {
      const list = getProductsFromDb();
      setProducts(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = () => {
    const nome = newNome.trim();
    const categoria = newCategoria.trim();
    const preco = parseFloat(newPreco);
    const estoque = parseInt(newEstoque);
    const estoqueMin = parseInt(newEstoqueMin);

    if (!nome) {
      Alert.alert('Erro', 'Por favor, insira o nome do produto.');
      return;
    }
    if (isNaN(preco) || preco < 0) {
      Alert.alert('Erro', 'Insira um preço de venda válido.');
      return;
    }
    if (isNaN(estoque) || estoque < 0) {
      Alert.alert('Erro', 'Insira a quantidade de estoque inicial.');
      return;
    }
    if (isNaN(estoqueMin) || estoqueMin < 0) {
      Alert.alert('Erro', 'Insira o estoque mínimo para alerta.');
      return;
    }

    try {
      insertProductInDb({
        nome,
        categoria: categoria || 'Geral',
        preco,
        estoqueAtual: estoque,
        estoqueMinimo: estoqueMin
      });

      setNewNome('');
      setNewCategoria('');
      setNewPreco('');
      setNewEstoque('');
      setNewEstoqueMin('');
      setShowAddForm(false);
      loadProducts();
      Alert.alert('Sucesso', 'Produto cadastrado com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao cadastrar produto no banco.');
      console.error(e);
    }
  };

  const handleSellProduct = () => {
    if (!selectedProduct) return;
    if (!openCashRegister) {
      Alert.alert('Caixa Fechado', 'Por favor, abra o caixa antes de realizar vendas.');
      return;
    }

    const qty = parseInt(sellQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Erro', 'Insira uma quantidade de venda válida.');
      return;
    }

    if (selectedProduct.estoqueAtual < qty) {
      Alert.alert('Erro', `Estoque insuficiente! Disponível apenas: ${selectedProduct.estoqueAtual}`);
      return;
    }

    const totalCost = selectedProduct.preco * qty;
    const nextStock = selectedProduct.estoqueAtual - qty;

    try {
      const now = Date.now();

      // 1. Decrement stock
      updateProductStockInDb(selectedProduct.id, nextStock);

      // 2. Record sale
      insertSaleInDb({
        productId: selectedProduct.id,
        quantidade: qty,
        valorTotal: totalCost,
        cashRegisterId: openCashRegister.id,
        timestamp: now
      });

      // 3. Record cash movement
      insertCashMovementInDb({
        cashRegisterId: openCashRegister.id,
        tipo: 'venda',
        valor: totalCost,
        motivo: `Venda de produto: ${qty}x ${selectedProduct.nome}`,
        timestamp: now
      });

      setSelectedProduct(null);
      setSellQty('1');
      loadProducts();

      // Alert & check stock warning
      if (nextStock <= selectedProduct.estoqueMinimo) {
        Alert.alert(
          'Venda Realizada com Sucesso',
          `Vendido: ${qty}x ${selectedProduct.nome}\nTotal: ${totalCost} Kz\n\n⚠️ AVISO: O estoque deste produto atingiu o nível mínimo (${nextStock} restantes)!`
        );
      } else {
        Alert.alert('Sucesso', `Venda realizada! Total: ${totalCost} Kz`);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível registrar a venda no banco.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Produtos</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Adicionar Produto Toggle */}
        <TouchableOpacity 
          style={[styles.addButton, { marginBottom: 15 }]} 
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Fechar Formuário' : '+ Cadastrar Novo Produto'}
          </Text>
        </TouchableOpacity>

        {/* Formuário de Cadastro */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Novo Produto</Text>
            
            <Text style={styles.fieldLabel}>Nome do Produto</Text>
            <TextInput
              style={styles.input}
              value={newNome}
              onChangeText={setNewNome}
              placeholder="Ex: Água Mineral 500ml"
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <TextInput
              style={styles.input}
              value={newCategoria}
              onChangeText={setNewCategoria}
              placeholder="Ex: Bebidas, Snacks, Doces"
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.fieldLabel}>Preço (Kz)</Text>
                <TextInput
                  style={styles.input}
                  value={newPreco}
                  onChangeText={setNewPreco}
                  keyboardType="numeric"
                  placeholder="150"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.fieldLabel}>Estoque Inicial</Text>
                <TextInput
                  style={styles.input}
                  value={newEstoque}
                  onChangeText={setNewEstoque}
                  keyboardType="numeric"
                  placeholder="30"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Estoque Mínimo (Alerta)</Text>
            <TextInput
              style={styles.input}
              value={newEstoqueMin}
              onChangeText={setNewEstoqueMin}
              keyboardType="numeric"
              placeholder="5"
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={handleCreateProduct}>
              <Text style={styles.addButtonText}>Salvar Produto</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Vendas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vender Produto</Text>
          {products.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum produto cadastrado no momento.</Text>
          ) : (
            products.map((product) => {
              const isLowStock = product.estoqueAtual <= product.estoqueMinimo;
              return (
                <TouchableOpacity 
                  key={product.id} 
                  style={[styles.productItem, isLowStock && styles.productItemLowStock]}
                  onPress={() => setSelectedProduct(product)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>
                      {product.nome} {isLowStock && '⚠️'}
                    </Text>
                    <Text style={styles.productPrice}>{product.preco} Kz • {product.categoria || 'Geral'}</Text>
                  </View>
                  <View style={[
                    styles.stockBadge,
                    isLowStock && { backgroundColor: '#FFEBEE' }
                  ]}>
                    <Text style={[
                      styles.stockText,
                      isLowStock && { color: '#F44336' }
                    ]}>Estoque: {product.estoqueAtual}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sell Quantity Dialog Modal */}
      {selectedProduct && (
        <Modal
          transparent
          animationType="fade"
          visible={selectedProduct !== null}
          onRequestClose={() => setSelectedProduct(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Vender: {selectedProduct.nome}</Text>
              <Text style={styles.modalSubtitle}>Disponível em estoque: {selectedProduct.estoqueAtual} unidades</Text>
              
              <Text style={styles.fieldLabel}>Quantidade</Text>
              <TextInput
                style={styles.modalInput}
                value={sellQty}
                onChangeText={setSellQty}
                keyboardType="numeric"
                selectTextOnFocus
              />

              <Text style={styles.modalTotal}>
                Total: {selectedProduct.preco * (parseInt(sellQty) || 0)} Kz
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#EEE', borderColor: '#DDD', borderWidth: 1 }]}
                  onPress={() => {
                    setSelectedProduct(null);
                    setSellQty('1');
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#666' }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={handleSellProduct}
                >
                  <Text style={styles.modalBtnText}>Confirmar Venda</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#0066CC',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productItemLowStock: {
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
    paddingLeft: 6,
  },
  productName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  stockText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
