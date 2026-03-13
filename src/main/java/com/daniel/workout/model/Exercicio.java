package com.daniel.workout.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity // Avisa ao Java que isso é uma tabela no banco de dados
@Data   // O Lombok cria os Getters e Setters automaticamente
public class Exercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // O banco gera o ID sozinho (1, 2, 3...)
    private Long id;

    private String nome;
    private int series;
    private int repeticoes;
    private double carga; // Em kg

    private String grupoMuscular; // Ex: Peito, Costas, Pernas
}